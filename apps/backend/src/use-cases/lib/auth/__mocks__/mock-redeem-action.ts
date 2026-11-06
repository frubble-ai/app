import { vi } from "vitest";

/** A redemption action that does nothing, as a spy so a test can tell whether it ran. */
export function mockRedeemAction() {
	return vi.fn(async () => undefined);
}
