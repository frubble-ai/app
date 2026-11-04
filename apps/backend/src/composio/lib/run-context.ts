import type { TComposio } from "./client";
import type { TSession } from "./session";

/**
 * What an action runs with: the client, the organization's connected account, and its session,
 * opened only by an action that runs a tool in one.
 */
export type TRunContext = {
	composio: TComposio;
	organizationId: string;
	connectedAccountId: string;
	session(): Promise<TSession>;
};
