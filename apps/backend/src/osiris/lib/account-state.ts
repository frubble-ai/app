import type { TAccountState } from "@/integrations";

/**
 * An osiris connection's status in our terms. Only pending rows are asked about, and a pending
 * connection never expires (expiring needs tokens), so `expired` reads as failed here; a live
 * connection that expires is reported by its `connection.expired` event instead.
 */
export function accountState(
	status: "pending" | "active" | "expired" | "failed",
): TAccountState {
	if (status === "pending" || status === "active") return status;
	return "failed";
}
