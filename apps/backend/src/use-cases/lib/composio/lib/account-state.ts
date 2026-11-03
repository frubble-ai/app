/** Where a connected account stands, in our terms. */
export type TConnectedAccountState = "pending" | "active" | "failed";

const STATES: Record<string, TConnectedAccountState> = {
	INITIALIZING: "pending",
	INITIATED: "pending",
	ACTIVE: "active",
};

/** A Composio account status in our terms; anything not pending or live has failed. */
export function accountState(status: string): TConnectedAccountState {
	return STATES[status] ?? "failed";
}

/** Composio's answer when an account is already gone, which is what removing asks for. */
export function isAlreadyGone(err: unknown): boolean {
	return (err as { status?: unknown })?.status === 404;
}
