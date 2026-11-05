import { faker } from "@faker-js/faker";
import { session } from "@frubble/db";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { getConfig } from "@/config";
import { setupIntegrationTestContext } from "@/testing/setup-integration-test-context";
import { signUpTestUser } from "@/testing/signup-test-user";
import { requestPasswordResetUseCase } from "@/use-cases/cases/request-password-reset.use-case";
import {
	INVALID_RESET_CODE_MESSAGE,
	resetPasswordUseCase,
} from "@/use-cases/cases/reset-password.use-case";
import { signInWithEmailPasswordUseCase } from "@/use-cases/cases/sign-in-with-email-password.use-case";
import { issueOneTimeCode } from "@/use-cases/lib/auth/one-time-code";

const { getClone } = setupIntegrationTestContext();

function newEmail(): string {
	return `reset+${faker.string.alphanumeric(8).toLowerCase()}@example.com`;
}

describe("requestPasswordResetUseCase", () => {
	it("emails a reset code to an existing account", async () => {
		const clone = getClone();
		const email = newEmail();
		await signUpTestUser(clone.auth, { email });

		await requestPasswordResetUseCase({ email: email.toUpperCase() });

		expect(clone.captured.emails).toEqual([
			{
				type: "password.reset_requested",
				email,
				code: expect.stringMatching(/^\d{6}$/),
			},
		]);
	});

	it("stays silent for an address with no account, so addresses cannot be enumerated", async () => {
		const clone = getClone();

		await expect(
			requestPasswordResetUseCase({ email: newEmail() }),
		).resolves.toBeUndefined();
		expect(clone.captured.emails).toEqual([]);
	});
});

describe("resetPasswordUseCase", () => {
	it("sets the new password, signs every session out and burns the code", async () => {
		const clone = getClone();
		const email = newEmail();
		const signedUp = await signUpTestUser(clone.auth, {
			email,
			password: "old-password-1",
		});
		await signInWithEmailPasswordUseCase({ email, password: "old-password-1" });
		const code = await issueOneTimeCode(
			clone.db,
			getConfig().passwordReset,
			email,
		);

		await resetPasswordUseCase({ email, code, newPassword: "new-password-22" });

		const sessions = await clone.db
			.select()
			.from(session)
			.where(eq(session.userId, signedUp.id));
		expect(sessions).toEqual([]);
		await expect(
			signInWithEmailPasswordUseCase({ email, password: "old-password-1" }),
		).rejects.toMatchObject({ name: "BadInputError" });
		await expect(
			signInWithEmailPasswordUseCase({ email, password: "new-password-22" }),
		).resolves.toMatchObject({ user: { id: signedUp.id } });
		await expect(
			resetPasswordUseCase({ email, code, newPassword: "another-password" }),
		).rejects.toThrow(INVALID_RESET_CODE_MESSAGE);
	});

	it("lets only one of two concurrent requests redeem the same code, and that password is the one that works", async () => {
		const clone = getClone();
		const email = newEmail();
		await signUpTestUser(clone.auth, { email, password: "old-password-1" });
		const code = await issueOneTimeCode(
			clone.db,
			getConfig().passwordReset,
			email,
		);
		const passwords = ["first-password-11", "second-password-22"];

		const settled = await Promise.allSettled(
			passwords.map((newPassword) =>
				resetPasswordUseCase({ email, code, newPassword }),
			),
		);

		const winners = passwords.filter(
			(_password, index) => settled[index]?.status === "fulfilled",
		);
		expect(winners).toHaveLength(1);
		const loser = settled.find((outcome) => outcome.status === "rejected");
		expect(loser).toMatchObject({
			reason: { message: INVALID_RESET_CODE_MESSAGE },
		});
		await expect(
			signInWithEmailPasswordUseCase({ email, password: winners[0] ?? "" }),
		).resolves.toBeDefined();
		const losing = passwords.find((password) => !winners.includes(password));
		await expect(
			signInWithEmailPasswordUseCase({ email, password: losing ?? "" }),
		).rejects.toMatchObject({ name: "BadInputError" });
	});

	it("keeps the code usable for a retry when the password update fails", async () => {
		const clone = getClone();
		const email = newEmail();
		await signUpTestUser(clone.auth, { email, password: "old-password-1" });
		const code = await issueOneTimeCode(
			clone.db,
			getConfig().passwordReset,
			email,
		);
		const authContext = await clone.auth.$context;
		const failure = new Error("password update failed");
		const spy = vi
			.spyOn(authContext.internalAdapter, "updatePassword")
			.mockRejectedValueOnce(failure);

		await expect(
			resetPasswordUseCase({ email, code, newPassword: "new-password-22" }),
		).rejects.toThrow(failure);
		spy.mockRestore();

		await expect(
			resetPasswordUseCase({ email, code, newPassword: "new-password-22" }),
		).resolves.toBeUndefined();
		await expect(
			signInWithEmailPasswordUseCase({ email, password: "new-password-22" }),
		).resolves.toBeDefined();
	});

	it.each([
		{
			label: "a wrong code",
			code: () => "000000",
			password: "new-password-22",
		},
		{
			label: "a short password",
			code: (real: string) => real,
			password: "short",
		},
	])("refuses $label", async ({ code, password }) => {
		const clone = getClone();
		const email = newEmail();
		await signUpTestUser(clone.auth, { email });
		const real = await issueOneTimeCode(
			clone.db,
			getConfig().passwordReset,
			email,
		);
		const sent =
			code(real) === "000000" && real === "000000" ? "111111" : code(real);

		await expect(
			resetPasswordUseCase({ email, code: sent, newPassword: password }),
		).rejects.toMatchObject({
			name: expect.stringMatching(/BadInputError|ZodError/),
		});
	});
});
