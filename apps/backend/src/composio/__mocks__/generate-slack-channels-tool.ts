import { generateComposioTool } from "./generate-composio-tool";

/** SLACK_LIST_ALL_CHANNELS as Composio defines it: the list and a channel's name optional. */
export function generateSlackChannelsTool() {
	return generateComposioTool({
		slug: "SLACK_LIST_ALL_CHANNELS",
		data: {
			type: "object",
			properties: {
				channels: {
					type: "array",
					items: {
						type: "object",
						properties: {
							id: { type: "string" },
							name: { type: "string" },
							is_private: { type: "boolean" },
							num_members: { type: "integer" },
						},
						required: ["id"],
					},
				},
			},
		},
	});
}
