import type { TAccountState } from "@/integrations";

const STATES: Record<string, TAccountState> = {
	INITIALIZING: "pending",
	INITIATED: "pending",
	ACTIVE: "active",
};

/** A Composio account status in our terms; anything not pending or live has failed. */
export function accountState(status: string): TAccountState {
	return STATES[status] ?? "failed";
}

/** Composio's answer when an account is already gone, which is what removing asks for. */
export function isAlreadyGone(err: unknown): boolean {
	return (err as { status?: unknown })?.status === 404;
}
