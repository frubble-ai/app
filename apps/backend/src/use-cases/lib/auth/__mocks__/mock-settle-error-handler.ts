import { vi } from "vitest";

/** The `onSettleError` handler of `redeemOneTimeCode`, as a spy, to see what it was told. */
export function mockSettleErrorHandler() {
	return vi.fn<(error: unknown) => void>();
}
