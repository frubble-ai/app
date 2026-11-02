import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { setupIntegrationTestContext } from "@/testing/setup-integration-test-context";
import { signUpTestUser } from "@/testing/signup-test-user";
import { changePasswordUseCase } from "@/use-cases/cases/change-password.use-case";
import { signInWithEmailPasswordUseCase } from "@/use-cases/cases/sign-in-with-email-password.use-case";

const { getClone } = setupIntegrationTestContext();

function newEmail(): string {
	return `change+${faker.string.alphanumeric(8).toLowerCase()}@example.com`;
}

async function signedInHeaders(
	email: string,
	password: string,
): Promise<Headers> {
	const { sessionToken } = await signInWithEmailPasswordUseCase({
		email,
		password,
	});
	return new Headers({ authorization: `Bearer ${sessionToken}` });
}

describe("changePasswordUseCase", () => {
	it("changes the password when the current one is right", async () => {
		const clone = getClone();
		const email = newEmail();
		const signedUp = await signUpTestUser(clone.auth, {
			email,
			password: "current-pw-1",
		});
		const headers = await signedInHeaders(email, "current-pw-1");

		await changePasswordUseCase({
			userId: signedUp.id,
			headers,
			currentPassword: "current-pw-1",
			newPassword: "brand-new-pw-2",
		});

		await expect(
			signInWithEmailPasswordUseCase({ email, password: "brand-new-pw-2" }),
		).resolves.toMatchObject({ user: { id: signedUp.id } });
	});

	it("replaces the caller's session: the old token is dead, the returned one lives", async () => {
		const clone = getClone();
		const email = newEmail();
		const signedUp = await signUpTestUser(clone.auth, {
			email,
			password: "current-pw-1",
		});
		const headers = await signedInHeaders(email, "current-pw-1");

		const { token } = await changePasswordUseCase({
			userId: signedUp.id,
			headers,
			currentPassword: "current-pw-1",
			newPassword: "brand-new-pw-2",
		});

		await expect(clone.auth.api.getSession({ headers })).resolves.toBeNull();
		await expect(
			clone.auth.api.getSession({
				headers: new Headers({ authorization: `Bearer ${token}` }),
			}),
		).resolves.toMatchObject({ user: { id: signedUp.id } });
	});

	it("refuses a wrong current password", async () => {
		const clone = getClone();
		const email = newEmail();
		const signedUp = await signUpTestUser(clone.auth, {
			email,
			password: "current-pw-1",
		});
		const headers = await signedInHeaders(email, "current-pw-1");

		await expect(
			changePasswordUseCase({
				userId: signedUp.id,
				headers,
				currentPassword: "not-the-current-one",
				newPassword: "brand-new-pw-2",
			}),
		).rejects.toMatchObject({
			name: "BadInputError",
			message: "Current password is incorrect.",
		});
	});
});
