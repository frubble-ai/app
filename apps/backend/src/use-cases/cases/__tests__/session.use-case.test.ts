import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { getConfig } from "@/config";
import { setupIntegrationTestContext } from "@/testing/setup-integration-test-context";
import { signUpTestUser } from "@/testing/signup-test-user";
import { buildTestAuth } from "@/testing/test-environment";
import { loadAuthenticatedUserFromRequestUseCase } from "@/use-cases/cases/load-authenticated-user-from-request.use-case";
import { signInWithEmailPasswordUseCase } from "@/use-cases/cases/sign-in-with-email-password.use-case";
import { signOutUseCase } from "@/use-cases/cases/sign-out.use-case";

const { getClone } = setupIntegrationTestContext();

function newEmail(): string {
	return `session+${faker.string.alphanumeric(8).toLowerCase()}@example.com`;
}

describe("a session, from sign-in to sign-out", () => {
	it("the bearer token identifies the user until they sign out", async () => {
		const clone = getClone();
		const email = newEmail();
		const signedUp = await signUpTestUser(clone.auth, { email });
		const { sessionToken } = await signInWithEmailPasswordUseCase({
			email,
			password: "password123",
		});
		const headers = new Headers({ authorization: `Bearer ${sessionToken}` });

		expect(await loadAuthenticatedUserFromRequestUseCase({ headers })).toEqual({
			id: signedUp.id,
			name: signedUp.name,
			email,
			role: "application_user",
		});

		await signOutUseCase({ headers, userId: signedUp.id });

		expect(
			await loadAuthenticatedUserFromRequestUseCase({ headers }),
		).toBeNull();
	});

	it("a session another API process revokes stops authenticating here at once", async () => {
		const clone = getClone();
		const email = newEmail();
		const signedUp = await signUpTestUser(clone.auth, { email });
		const { sessionToken } = await signInWithEmailPasswordUseCase({
			email,
			password: "password123",
		});
		const headers = new Headers({ authorization: `Bearer ${sessionToken}` });
		expect(
			await loadAuthenticatedUserFromRequestUseCase({ headers }),
		).not.toBeNull();
		// A second API process: its own Better Auth over the same database, so this process's
		// instance is never told.
		const other = buildTestAuth(clone.db, getConfig());

		await (await other.$context).internalAdapter.deleteUserSessions(
			signedUp.id,
		);

		expect(
			await loadAuthenticatedUserFromRequestUseCase({ headers }),
		).toBeNull();
	});

	it.each([
		{ label: "no token", headers: () => new Headers() },
		{
			label: "a token nobody issued",
			headers: () =>
				new Headers({
					authorization: `Bearer ${faker.string.alphanumeric(40)}`,
				}),
		},
	])("a request with $label is signed out", async ({ headers }) => {
		expect(
			await loadAuthenticatedUserFromRequestUseCase({ headers: headers() }),
		).toBeNull();
	});
});
