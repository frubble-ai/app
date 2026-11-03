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

/** The workspace's channels the connected user can see, archived ones left out. */
export async function listSlackChannels(
	composio: TComposio,
	account: TConnectedAccountRef,
): Promise<TIntegrationPreviewItem[]> {
	const data = await executeRead(composio, account, {
		slug: "SLACK_LIST_ALL_CHANNELS",
		version: TOOLKIT_VERSION,
		arguments: { limit: 100, exclude_archived: true },
	});
	return toPreviewItems(data, ["channels"]);
}
