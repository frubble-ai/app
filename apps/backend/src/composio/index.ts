import { Composio } from "@composio/core";
import type { TIntegrationProvider } from "@frubble/db";
import type { TConfig } from "@/config";
import {
	PREVIEW_TOOLS,
	type TIntegrationPreviewItem,
	TOOLKIT_VERSIONS,
	toPreviewItems,
} from "./lib/preview-tools";

export type { TIntegrationPreviewItem } from "./lib/preview-tools";

/** Where a connected account stands, in our terms. */
export type TConnectedAccountState = "pending" | "active" | "failed";

/**
 * Composio behind the calls the use cases need. A connected account belongs to a Composio user;
 * ours is the organization id, so every organization's tokens stay apart.
 */
export type TIntegrationsClient = {
	link(args: {
		organizationId: string;
		provider: TIntegrationProvider;
		callbackUrl: string;
	}): Promise<{ connectedAccountId: string; redirectUrl: string }>;
	getState(connectedAccountId: string): Promise<TConnectedAccountState>;
	remove(connectedAccountId: string): Promise<void>;
	preview(args: {
		organizationId: string;
		provider: TIntegrationProvider;
		connectedAccountId: string;
	}): Promise<TIntegrationPreviewItem[]>;
};

const STATES: Record<string, TConnectedAccountState> = {
	INITIALIZING: "pending",
	INITIATED: "pending",
	ACTIVE: "active",
};

export function createIntegrationsClient(
	config: TConfig["composio"],
): TIntegrationsClient {
	const composio = new Composio({
		apiKey: config.apiKey,
		toolkitVersions: TOOLKIT_VERSIONS,
	});

	return {
		async link({ organizationId, provider, callbackUrl }) {
			// `initiate`, not `link`: on our own OAuth apps it answers the provider's consent page
			// itself, where `link` sends the user through Composio's hosted page first.
			// allowMultiple: a reconnect starts while the old connection still works.
			const request = await composio.connectedAccounts.initiate(
				organizationId,
				config.authConfigIds[provider],
				{ callbackUrl, allowMultiple: true },
			);
			if (!request.redirectUrl) {
				throw new Error(`Composio returned no redirect URL for ${provider}`);
			}
			return {
				connectedAccountId: request.id,
				redirectUrl: request.redirectUrl,
			};
		},

		async getState(connectedAccountId) {
			const account = await composio.connectedAccounts.get(connectedAccountId);
			return STATES[account.status] ?? "failed";
		},

		async remove(connectedAccountId) {
			try {
				await composio.connectedAccounts.delete(connectedAccountId);
			} catch (err) {
				// Already gone is what removing asks for.
				if ((err as { status?: unknown }).status !== 404) throw err;
			}
		},

		async preview({ organizationId, provider, connectedAccountId }) {
			const tool = PREVIEW_TOOLS[provider];
			const result = await composio.tools.execute(tool.slug, {
				userId: organizationId,
				connectedAccountId,
				arguments: tool.arguments,
			});
			if (!result.successful) {
				throw new Error(`${tool.slug} failed: ${result.error ?? "no error"}`);
			}
			return toPreviewItems(result.data, tool.listKeys);
		},
	};
}
