import { faker } from "@faker-js/faker";

/** One channel as Slack returns it through Composio. */
export function generateComposioSlackChannel(
	overrides: Record<string, unknown> = {},
) {
	return {
		id: `C${faker.string.alphanumeric(10).toUpperCase()}`,
		name: faker.lorem.slug(2),
		is_private: faker.datatype.boolean(),
		num_members: faker.number.int({ min: 1, max: 500 }),
		...overrides,
	};
}
