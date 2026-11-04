import { faker } from "@faker-js/faker";

/** `GET /api/v3.1/connected_accounts/{id}` as Composio answers it, credentials left out. */
export function generateComposioConnectedAccount(
	id: string,
	status: "INITIATED" | "ACTIVE" | "FAILED",
) {
	const at = faker.date.recent().toISOString();
	return {
		user_id: faker.string.alphanumeric(32),
		id,
		word_id: faker.lorem.slug(2),
		alias: null,
		toolkit: { slug: "github" },
		auth_config: {
			id: `ac_${faker.string.alphanumeric(12)}`,
			auth_scheme: "OAUTH2",
			is_composio_managed: false,
			is_disabled: false,
		},
		status,
		created_at: at,
		updated_at: at,
		data: {},
		params: {},
		state: { authScheme: "OAUTH2", val: { status } },
		status_reason: null,
		is_disabled: false,
	};
}
