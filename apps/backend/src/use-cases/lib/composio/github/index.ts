import type { TComposio } from "@/composio";
import { executeTool } from "@/use-cases/lib/composio/lib/execute-tool";
import type { TSession } from "@/use-cases/lib/composio/lib/session";
import { allowNullDescription } from "./output-patch";

/** A GitHub organization the connected user belongs to. */
export type TGithubOrganization = {
	id: string;
	login: string;
	description: string | null;
	avatarUrl: string;
};

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
