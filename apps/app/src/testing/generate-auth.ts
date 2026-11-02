import { faker } from "@faker-js/faker";
import { UserRole, type useAuth } from "@frubble/react-sdk";

type TAuth = ReturnType<typeof useAuth>;

/**
 * What `useAuth` answers: a signed-in user unless `overrides` says otherwise. It has none of the
 * actions (`signIn`…); a test that drives one passes it in `overrides`.
 */
export function generateAuth(overrides: Partial<TAuth> = {}): TAuth {
	return {
		user: {
			id: faker.string.alphanumeric(32),
			name: faker.person.fullName(),
			email: faker.internet.email().toLowerCase(),
			role: UserRole.ApplicationUser,
		},
		role: UserRole.ApplicationUser,
		isAuthenticated: true,
		isPending: false,
		isUnknown: false,
		...overrides,
	} as TAuth;
}

/** `useAuth` before the API has said who is signed in. */
export function generatePendingAuth(): TAuth {
	return generateAuth({
		user: null,
		role: null,
		isAuthenticated: false,
		isPending: true,
	});
}

/** `useAuth` with nobody signed in. */
export function generateSignedOutAuth(): TAuth {
	return generateAuth({ user: null, role: null, isAuthenticated: false });
}
