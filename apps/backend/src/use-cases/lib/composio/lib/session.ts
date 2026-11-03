import type { TComposio } from "@/composio";

/** An organization's Composio session for one toolkit, on our own OAuth app (auth config). */
export type TSessionTarget = {
	organizationId: string;
	toolkit: string;
	authConfigId: string;
	/** The organization's account to run tools with; none while connecting. */
	connectedAccountId?: string;
};

/**
 * A session scoped to one organization and one toolkit. Connecting happens in our own UI, so the
 * in-chat connection meta tool is off.
 */
export function openSession(composio: TComposio, target: TSessionTarget) {
	return composio.create(target.organizationId, {
		toolkits: [target.toolkit],
		authConfigs: { [target.toolkit]: target.authConfigId },
		...(target.connectedAccountId
			? { connectedAccounts: { [target.toolkit]: [target.connectedAccountId] } }
			: {}),
		manageConnections: false,
	});
}

export type TSession = Awaited<ReturnType<typeof openSession>>;
