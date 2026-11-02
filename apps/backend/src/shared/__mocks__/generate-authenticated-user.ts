import { faker } from "@faker-js/faker";
import type { IAuthenticatedUser } from "@/services/api/graphql/shared/lib/guards";

export function generateAuthenticatedUser(
	overrides: Partial<IAuthenticatedUser> = {},
): IAuthenticatedUser {
	return {
		id: faker.string.alphanumeric(32),
		name: faker.person.fullName(),
		email: faker.internet.email().toLowerCase(),
		role: "application_user",
		...overrides,
	};
}
