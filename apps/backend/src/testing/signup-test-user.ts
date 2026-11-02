import { faker } from "@faker-js/faker";
import type { TAuth } from "@/better-auth";
import type { IAuthenticatedUser } from "@/services/api/graphql/shared/lib/guards";

const TEST_USER_PASSWORD = "password123";

/** Sign up through Better Auth, as a real sign-up does. Password: `password123` unless given. */
export async function signUpTestUser(
	auth: TAuth,
	options: Partial<{ email: string; password: string; name: string }> = {},
): Promise<IAuthenticatedUser> {
	const email =
		options.email ??
		`test+${faker.string.alphanumeric(10).toLowerCase()}@example.com`;
	const password = options.password ?? TEST_USER_PASSWORD;
	const name = options.name ?? faker.person.fullName();

	const result = await auth.api.signUpEmail({
		body: { email, password, name },
	});
	if (!result.user?.id) {
		throw new Error(`signUpTestUser: signUpEmail returned no user (${email})`);
	}
	return {
		id: result.user.id,
		name: result.user.name,
		email: result.user.email,
	};
}
