import { faker } from "@faker-js/faker";
import type { TAuthSignInResult } from "@/use-cases/lib/auth/auth-user";

export function generateAuthSignInResult(
	overrides: Partial<TAuthSignInResult> = {},
): TAuthSignInResult {
	return {
		sessionToken: faker.string.alphanumeric(40),
		user: {
			id: faker.string.alphanumeric(32),
			name: faker.person.fullName(),
			role: "application_user",
			email: faker.internet.email().toLowerCase(),
		},
		...overrides,
	};
}
