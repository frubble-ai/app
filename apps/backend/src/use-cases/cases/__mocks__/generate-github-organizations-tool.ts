import { generateComposioTool } from "@/testing/generate-composio-tool";

/**
 * GITHUB_LIST_ORGANIZATIONS_FOR_THE_AUTHENTICATED_USER as Composio defines it: `data` through
 * `$defs`, and an organization's `description` typed as a string though GitHub sends null.
 * `required` changes which organization fields the schema requires, as a newer version might.
 */
export function generateGithubOrganizationsTool(
	organization: { required?: string[] } = {},
) {
	return generateComposioTool({
		slug: "GITHUB_LIST_ORGANIZATIONS_FOR_THE_AUTHENTICATED_USER",
		data: { $ref: "#/$defs/Response" },
		defs: {
			Response: {
				type: "object",
				properties: {
					organizations: {
						type: "array",
						items: { $ref: "#/$defs/Organization" },
					},
				},
				required: ["organizations"],
			},
			Organization: {
				type: "object",
				properties: {
					id: { type: "integer" },
					login: { type: "string" },
					description: {
						type: "string",
						description: "The organization's description (can be null)",
					},
					avatar_url: { type: "string" },
				},
				required: organization.required ?? ["id", "login", "avatar_url"],
			},
		},
	});
}
