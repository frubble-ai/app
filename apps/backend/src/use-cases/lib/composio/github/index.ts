import type { TComposio } from "@/composio";
import { executeTool } from "@/use-cases/lib/composio/lib/execute-tool";
import type { TJsonSchema } from "@/use-cases/lib/composio/lib/output-schema";
import type { TSession } from "@/use-cases/lib/composio/lib/session";

/** A GitHub organization the connected user belongs to. */
export type TGithubOrganization = {
	id: string;
	login: string;
	description: string | null;
	avatarUrl: string;
};

/**
 * Composio types an organization's `description` as a string, though its own text says it can be
 * null and GitHub sends null for an organization without one (seen 2026-11-03, version
 * 20261103_00). Remove once Composio's schema allows null.
 */
function allowNullDescription(schema: TJsonSchema): TJsonSchema {
	const defs = schema.$defs as
		| { Organization?: { properties?: Record<string, unknown> } }
		| undefined;
	const description = defs?.Organization?.properties?.description;
	if (!defs?.Organization?.properties || !description) return schema;
	return {
		...schema,
		$defs: {
			...defs,
			Organization: {
				...defs.Organization,
				properties: {
					...defs.Organization.properties,
					description: { anyOf: [description, { type: "null" }] },
				},
			},
		},
	};
}

/** The organizations the connected GitHub user belongs to. */
export async function listGithubOrganizations(
	composio: TComposio,
	session: TSession,
): Promise<TGithubOrganization[]> {
	const data = (await executeTool(composio, session, {
		slug: "GITHUB_LIST_ORGANIZATIONS_FOR_THE_AUTHENTICATED_USER",
		arguments: { per_page: 100 },
		patch: allowNullDescription,
	})) as {
		organizations: Array<{
			id: number;
			login: string;
			description?: string | null;
			avatar_url: string;
		}>;
	};
	return data.organizations.map((entry) => ({
		id: String(entry.id),
		login: entry.login,
		description: entry.description ?? null,
		avatarUrl: entry.avatar_url,
	}));
}
