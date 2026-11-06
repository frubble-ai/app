import { inspect } from "node:util";
import { faker } from "@faker-js/faker";
import { session } from "@frubble/db";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { getConfig } from "@/config";
import { setupIntegrationTestContext } from "@/testing/setup-integration-test-context";
import { signUpTestUser } from "@/testing/signup-test-user";
import { mockDatabaseWriteFailure } from "@/use-cases/__mocks__/mock-database-write-failure";
import { mockTestLoggerError } from "@/use-cases/__mocks__/mock-test-logger-error";
import { requestPasswordResetUseCase } from "@/use-cases/cases/request-password-reset.use-case";
import {
	INVALID_RESET_CODE_MESSAGE,
	resetPasswordUseCase,
} from "@/use-cases/cases/reset-password.use-case";
import { signInWithEmailPasswordUseCase } from "@/use-cases/cases/sign-in-with-email-password.use-case";
import { issueOneTimeCode } from "@/use-cases/lib/auth/one-time-code";

const { getClone } = setupIntegrationTestContext();

function newPassword(): string {
	return faker.internet.password({ length: 16 });
}

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
		await signUpTestUser(clone.auth, { email, password: newPassword() });
		const code = await issueOneTimeCode(
			clone.db,
			getConfig().passwordReset,
			email,
		);
		const passwords = [newPassword(), newPassword()];

		const settled = await Promise.allSettled(
			passwords.map((password) =>
				resetPasswordUseCase({ email, code, newPassword: password }),
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
		const password = newPassword();
		await signUpTestUser(clone.auth, { email, password: newPassword() });
		const code = await issueOneTimeCode(
			clone.db,
			getConfig().passwordReset,
			email,
		);
		const failing = await mockDatabaseWriteFailure(clone.db, {
			table: "account",
			event: "UPDATE",
		});

		await expect(
			resetPasswordUseCase({ email, code, newPassword: password }),
		).rejects.toMatchObject({
			cause: { message: expect.stringContaining(failing.marker) },
		});
		await failing.restore();

		await expect(
			resetPasswordUseCase({ email, code, newPassword: password }),
		).resolves.toBeUndefined();
		await expect(
			signInWithEmailPasswordUseCase({ email, password }),
		).resolves.toBeDefined();
	});

	it("burns the code when the password is already written and revoking the sessions fails", async () => {
		const clone = getClone();
		const email = newEmail();
		const password = newPassword();
		await signUpTestUser(clone.auth, { email, password: newPassword() });
		const code = await issueOneTimeCode(
			clone.db,
			getConfig().passwordReset,
			email,
		);
		const failing = await mockDatabaseWriteFailure(clone.db, {
			table: "session",
			event: "DELETE",
		});

		await expect(
			resetPasswordUseCase({ email, code, newPassword: password }),
		).rejects.toMatchObject({
			cause: { message: expect.stringContaining(failing.marker) },
		});
		await failing.restore();

		await expect(
			resetPasswordUseCase({ email, code, newPassword: newPassword() }),
		).rejects.toThrow(INVALID_RESET_CODE_MESSAGE);
		await expect(
			signInWithEmailPasswordUseCase({ email, password }),
		).resolves.toBeDefined();
	});

	it("logs a failed settle as a name and a code, never the error with its query", async () => {
		const clone = getClone();
		const email = newEmail();
		await signUpTestUser(clone.auth, { email, password: newPassword() });
		const code = await issueOneTimeCode(
			clone.db,
			getConfig().passwordReset,
			email,
		);
		const loggedErrors = mockTestLoggerError();
		const blockedSessions = await mockDatabaseWriteFailure(clone.db, {
			table: "session",
			event: "DELETE",
		});
		const blockedCodes = await mockDatabaseWriteFailure(clone.db, {
			table: "verification",
			event: "DELETE",
		});

		await expect(
			resetPasswordUseCase({ email, code, newPassword: newPassword() }),
		).rejects.toMatchObject({
			cause: { message: expect.stringContaining(blockedSessions.marker) },
		});
		await blockedSessions.restore();
		await blockedCodes.restore();

		const line = loggedErrors.mock.calls.find(
			([, message]) => message === "reset code could not be settled",
		);
		expect(line).toBeDefined();
		expect(line?.[0]).toEqual({
			errorName: expect.any(String),
			errorCode: "P0001",
		});
		const everything = inspect(loggedErrors.mock.calls, { depth: 8 });
		expect(everything).not.toContain(blockedCodes.marker);
		expect(everything).not.toMatch(/delete from "verification"/i);
		loggedErrors.mockRestore();
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
