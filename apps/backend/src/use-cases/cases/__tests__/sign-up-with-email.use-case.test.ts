import { faker } from "@faker-js/faker";
import { user, verification } from "@frubble/db";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { getConfig } from "@/config";
import { setupIntegrationTestContext } from "@/testing/setup-integration-test-context";
import {
	INVALID_SIGN_UP_CODE_MESSAGE,
	signUpWithEmailUseCase,
} from "@/use-cases/cases/sign-up-with-email.use-case";
import {
	codeIdentifier,
	issueOneTimeCode,
} from "@/use-cases/lib/auth/one-time-code";

const { getClone } = setupIntegrationTestContext();

function newEmail(): string {
	return `new+${faker.string.alphanumeric(8).toLowerCase()}@example.com`;
}

async function codeRowsFor(identifier: string) {
	return getClone()
		.db.select({ id: verification.id })
		.from(verification)
		.where(eq(verification.identifier, identifier));
}

describe("signUpWithEmailUseCase", () => {
	it("a valid sign-up code creates a verified customer and burns the code", async () => {
		const clone = getClone();
		const email = newEmail();
		const name = faker.person.fullName();
		const code = await issueOneTimeCode(
			clone.db,
			getConfig().authSignup,
			email,
		);

		const result = await signUpWithEmailUseCase({
			email: email.toUpperCase(),
			code,
			name,
			password: "password123",
		});

		expect(result.user).toEqual({
			id: expect.any(String),
			name,
			email,
		});
		expect(result.sessionToken).toEqual(expect.any(String));
		const [row] = await clone.db
			.select()
			.from(user)
			.where(eq(user.id, result.user.id));
		expect(row).toMatchObject({ emailVerified: true });
		expect(
			await codeRowsFor(codeIdentifier(getConfig().authSignup, email)),
		).toEqual([]);
	});

	it("a wrong code is refused and no user is created", async () => {
		const clone = getClone();
		const email = newEmail();
		const code = await issueOneTimeCode(
			clone.db,
			getConfig().authSignup,
			email,
		);
		const wrong = code === "000000" ? "111111" : "000000";

		await expect(
			signUpWithEmailUseCase({
				email,
				code: wrong,
				name: faker.person.fullName(),
				password: "password123",
			}),
		).rejects.toThrow(INVALID_SIGN_UP_CODE_MESSAGE);
		const users = await clone.db
			.select()
			.from(user)
			.where(eq(user.email, email));
		expect(users).toEqual([]);
	});

	it("an address with no code is refused", async () => {
		await expect(
			signUpWithEmailUseCase({
				email: newEmail(),
				code: "123456",
				name: faker.person.fullName(),
				password: "password123",
			}),
		).rejects.toThrow(INVALID_SIGN_UP_CODE_MESSAGE);
	});

	it("a password Better Auth refuses leaves the code usable for a retry", async () => {
		const clone = getClone();
		const email = newEmail();
		const name = faker.person.fullName();
		const code = await issueOneTimeCode(
			clone.db,
			getConfig().authSignup,
			email,
		);

		await expect(
			signUpWithEmailUseCase({ email, code, name, password: "short" }),
		).rejects.toMatchObject({
			name: "BadInputError",
			message: "Password must be at least 8 characters.",
		});
		expect(
			await codeRowsFor(codeIdentifier(getConfig().authSignup, email)),
		).toHaveLength(1);

		const result = await signUpWithEmailUseCase({
			email,
			code,
			name,
			password: "long-enough-password",
		});
		expect(result.user.email).toBe(email);
	});

	it("an address that already has an account is refused as forbidden", async () => {
		const clone = getClone();
		const email = newEmail();
		const first = await issueOneTimeCode(
			clone.db,
			getConfig().authSignup,
			email,
		);
		await signUpWithEmailUseCase({
			email,
			code: first,
			name: faker.person.fullName(),
			password: "long-enough-password",
		});
		const second = await issueOneTimeCode(
			clone.db,
			getConfig().authSignup,
			email,
		);

		await expect(
			signUpWithEmailUseCase({
				email,
				code: second,
				name: faker.person.fullName(),
				password: "long-enough-password",
			}),
		).rejects.toMatchObject({ name: "ForbiddenError" });
	});
});
