import type { TComposio } from "@/composio/lib/client";
import { executeTool } from "@/composio/lib/execute-tool";
import type { TSession } from "@/composio/lib/session";
import type { TGithubOrganization } from "@/integrations";
import { allowNullDescription } from "./lib/output-patch";

/** The organizations the connected GitHub user belongs to. */
export async function listGithubOrganizations(
	composio: TComposio,
	session: TSession,
): Promise<TGithubOrganization[]> {
	const data = await executeTool(composio, session, {
		slug: "GITHUB_LIST_ORGANIZATIONS_FOR_THE_AUTHENTICATED_USER",
		arguments: { per_page: 100 },
		patch: allowNullDescription,
	});
	return data.organizations.map((entry) => ({
		id: String(entry.id),
		login: entry.login,
		description: entry.description ?? null,
		avatarUrl: entry.avatar_url,
	}));
}
