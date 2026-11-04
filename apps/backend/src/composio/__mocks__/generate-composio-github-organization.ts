import { faker } from "@faker-js/faker";

/** One organization as GitHub returns it through Composio, `description` null as GitHub sends it. */
export function generateComposioGithubOrganization(
	overrides: Record<string, unknown> = {},
) {
	return {
		id: faker.number.int({ min: 1, max: 1_000_000_000 }),
		login: faker.internet.username().toLowerCase(),
		description: null,
		avatar_url: faker.image.avatar(),
		...overrides,
	};
}
