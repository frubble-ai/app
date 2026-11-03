import { faker } from "@faker-js/faker";

/** `POST /api/v3.1/tool_router/session` as Composio answers it, for `userId`. */
export function generateComposioSession(userId: string) {
	const sessionId = `trs_${faker.string.alphanumeric(12)}`;
	return {
		session_id: sessionId,
		mcp: {
			type: "http",
			url: `https://backend.composio.dev/tool_router/${sessionId}/mcp`,
		},
		tool_router_tools: [],
		config: {
			user_id: userId,
			toolkits: { enabled: [] },
			auth_configs: {},
			manage_connections: {
				enabled: false,
				enable_wait_for_connections: false,
				enable_connection_removal: true,
			},
			connected_accounts: {},
		},
		config_version: 1,
		experimental: {},
		warnings: [],
	};
}
