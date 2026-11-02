import { faker } from "@faker-js/faker";
import { UserRole } from "@frubble/gql/types";

/** A session as the API returns it from signing up or in. */
export function generateAuthPayload() {
	return {
		token: faker.string.alphanumeric(40),
		user: {
			id: faker.string.alphanumeric(32),
			name: faker.person.fullName(),
			email: faker.internet.email(),
			role: UserRole.ApplicationUser,
		},
	};
}
