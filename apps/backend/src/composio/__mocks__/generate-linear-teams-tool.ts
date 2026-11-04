import { generateComposioTool } from "./generate-composio-tool";

/**
 * LINEAR_LIST_LINEAR_TEAMS as Composio defines it: `teams` with untyped items beside a typed
 * `items` list, which `typeTeams` patches.
 */
export function generateLinearTeamsTool() {
	return generateComposioTool({
		slug: "LINEAR_LIST_LINEAR_TEAMS",
		data: { $ref: "#/$defs/ListLinearTeamsResponse" },
		defs: {
			ListLinearTeamsResponse: {
				type: "object",
				properties: {
					items: {
						type: "array",
						items: { $ref: "#/$defs/ListLinearTeamsResponseSingleItem" },
					},
					teams: { type: "array", items: {} },
				},
				required: ["teams"],
			},
			ListLinearTeamsResponseSingleItem: {
				type: "object",
				properties: {
					id: { type: "string" },
					name: { type: "string" },
					members: { type: "array", items: {} },
					projects: { type: "array", items: {} },
				},
				required: ["id", "name", "members", "projects"],
			},
		},
	});
}
