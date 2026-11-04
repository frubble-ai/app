import { faker } from "@faker-js/faker";

/** One team as Linear returns it through Composio. */
export function generateComposioLinearTeam(
	overrides: Record<string, unknown> = {},
) {
	return {
		id: faker.string.uuid(),
		name: faker.company.name(),
		members: [],
		projects: [],
		...overrides,
	};
}
