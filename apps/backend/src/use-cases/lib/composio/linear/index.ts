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
const TOOLKIT_VERSION = "20260924_00";

/** The Linear teams the connected user can see. */
export async function listLinearTeams(
	composio: TComposio,
	account: TConnectedAccountRef,
): Promise<TIntegrationPreviewItem[]> {
	const data = await executeRead(composio, account, {
		slug: "LINEAR_LIST_LINEAR_TEAMS",
		version: TOOLKIT_VERSION,
		arguments: { first: 50 },
	});
	return toPreviewItems(data, ["teams", "nodes"]);
}
