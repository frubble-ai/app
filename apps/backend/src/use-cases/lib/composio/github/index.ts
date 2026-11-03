import type { TComposio } from "@/composio";
import {
	executeRead,
	type TConnectedAccountRef,
} from "@/use-cases/lib/composio/lib/execute-read";
import {
	type TIntegrationPreviewItem,
	toPreviewItems,
} from "@/use-cases/lib/composio/lib/preview-items";

// Pinned, so a Composio release cannot change a tool under us. Bump after reading its changelog.
const TOOLKIT_VERSION = "20261023_00";

/** The organizations the connected GitHub user belongs to. */
export async function listGithubOrganizations(
	composio: TComposio,
	account: TConnectedAccountRef,
): Promise<TIntegrationPreviewItem[]> {
	const data = await executeRead(composio, account, {
		slug: "GITHUB_LIST_ORGANIZATIONS_FOR_THE_AUTHENTICATED_USER",
		version: TOOLKIT_VERSION,
		arguments: { per_page: 50 },
	});
	return toPreviewItems(data, ["details", "organizations"]);
}
