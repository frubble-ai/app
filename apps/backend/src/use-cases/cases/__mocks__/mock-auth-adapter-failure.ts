import { vi } from "vitest";
import type { TAuth } from "@/better-auth";

type TInternalAdapter = Awaited<TAuth["$context"]>["internalAdapter"];

/**
 * Makes the next call of one Better Auth internal adapter method reject with `error`, then lets
 * it work again. Returns the spy so the test can restore it.
 */
export function mockAuthAdapterFailureOnce(
	adapter: TInternalAdapter,
	method: "updatePassword" | "deleteUserSessions",
	error: Error,
) {
	return vi.spyOn(adapter, method).mockRejectedValueOnce(error);
}
