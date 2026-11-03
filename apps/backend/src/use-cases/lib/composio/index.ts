import type { TIntegrationProvider } from "@frubble/db";
import type { TComposio } from "@/composio";
import { listGithubOrganizations } from "./github";
import type { TConnectedAccountRef } from "./lib/execute-read";
import type { TIntegrationPreviewItem } from "./lib/preview-items";
import { listLinearTeams } from "./linear";
import { listSlackChannels } from "./slack";

export {
	accountState,
	isAlreadyGone,
	type TConnectedAccountState,
} from "./lib/account-state";
export type { TIntegrationPreviewItem } from "./lib/preview-items";

/** The read that proves each provider's connection works. */
export const PREVIEWS: Record<
	TIntegrationProvider,
	(
		composio: TComposio,
		account: TConnectedAccountRef,
	) => Promise<TIntegrationPreviewItem[]>
> = {
	github: listGithubOrganizations,
	linear: listLinearTeams,
	slack: listSlackChannels,
};
