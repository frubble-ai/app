import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { getConfig } from "@/config";
import { setupIntegrationTestContext } from "@/testing/setup-integration-test-context";
import {
	INVALID_SIGN_UP_CODE_MESSAGE,
	signUpWithEmailUseCase,
} from "@/use-cases/cases/sign-up-with-email.use-case";
import { issueOneTimeCode } from "@/use-cases/lib/auth/one-time-code";

// An environment without an email provider: the fixed code stands in for the emailed one.
const { getClone } = setupIntegrationTestContext({
	config: { email: { delivery: "none", fixedCode: "111111" } },
});

function newEmail(): string {
	return `new+${faker.string.alphanumeric(8).toLowerCase()}@example.com`;
}

describe("signing up without email delivery", () => {
	it("the fixed code finishes a customer sign-up whose code was requested", async () => {
		const clone = getClone();
		const email = newEmail();
		await issueOneTimeCode(clone.db, getConfig().authSignup, email);

		const result = await signUpWithEmailUseCase({
			email,
			code: "111111",
			name: faker.person.fullName(),
			password: "password123",
		});

		expect(result.user).toMatchObject({ email, role: "customer" });
	});

	it("the fixed code does nothing for an address that requested no code", async () => {
		await expect(
			signUpWithEmailUseCase({
				email: newEmail(),
				code: "111111",
				name: faker.person.fullName(),
				password: "password123",
			}),
		).rejects.toThrow(INVALID_SIGN_UP_CODE_MESSAGE);
	});

	it("the fixed code never redeems an admin invite", async () => {
		const clone = getClone();
		const email = newEmail();
		await issueOneTimeCode(clone.db, getConfig().adminSignup, email);

		await expect(
			signUpWithEmailUseCase({
				email,
				code: "111111",
				name: faker.person.fullName(),
				password: "password123",
			}),
		).rejects.toThrow(INVALID_SIGN_UP_CODE_MESSAGE);
	});
});
