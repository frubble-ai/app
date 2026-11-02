import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { getConfig } from "@/config";
import { insertTestUser } from "@/testing/insert-test-user";
import { setupIntegrationTestContext } from "@/testing/setup-integration-test-context";
import { requestSignUpCodeUseCase } from "@/use-cases/cases/request-sign-up-code.use-case";
import { SIGN_UP_UNAVAILABLE_MESSAGE } from "@/use-cases/cases/sign-up-with-email.use-case";
import { verifyOneTimeCode } from "@/use-cases/lib/auth/one-time-code";

const { getClone } = setupIntegrationTestContext();

function newEmail(): string {
	return `new+${faker.string.alphanumeric(8).toLowerCase()}@example.com`;
}

describe("requestSignUpCodeUseCase", () => {
	it("emails a code that verifies for the normalized address", async () => {
		const clone = getClone();
		const email = newEmail();

		await requestSignUpCodeUseCase({ email: `  ${email.toUpperCase()} ` });

		expect(clone.captured.emails).toEqual([
			{
				type: "signup.code_requested",
				email,
				code: expect.stringMatching(/^\d{6}$/),
			},
		]);
		const sent = clone.captured.emails[0] as { code: string };
		expect(
			await verifyOneTimeCode(
				clone.db,
				getConfig().authSignup,
				email,
				sent.code,
			),
		).toBe("valid");
	});

	it("an address that already has an account is refused without an email", async () => {
		const clone = getClone();
		const existing = await insertTestUser(clone.db);

		await expect(
			requestSignUpCodeUseCase({ email: existing.email }),
		).rejects.toThrow(SIGN_UP_UNAVAILABLE_MESSAGE);
		expect(clone.captured.emails).toEqual([]);
	});

	it("a malformed address is refused", async () => {
		await expect(
			requestSignUpCodeUseCase({ email: "not-an-email" }),
		).rejects.toBeInstanceOf(ZodError);
	});
});

describe("requestSignUpCodeUseCase rate limit", () => {
	it("stops an address after too many code requests", async () => {
		const email = newEmail();
		const { limit } = getConfig().authRateLimits.perEmail;
		for (let attempt = 0; attempt < limit; attempt++) {
			await requestSignUpCodeUseCase({ email });
		}

		await expect(requestSignUpCodeUseCase({ email })).rejects.toMatchObject({
			name: "TooManyRequestsError",
		});
	});

	it("fails the request when the queue refuses the email, so the caller can retry", async () => {
		const clone = getClone();
		clone.captured.failNext("emails");

		await expect(
			requestSignUpCodeUseCase({ email: newEmail() }),
		).rejects.toThrow(/delivery failed/);
	});
});
