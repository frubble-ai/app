import { vi } from "vitest";
import type { TComposio } from "@/composio";

/**
 * A Composio stand-in with the calls the use cases make, each a `vi.fn()` a test sets up.
 * `client` goes on the context; the rest is what tests drive and assert.
 */
export function createMockComposio() {
	const connectedAccounts = {
		initiate: vi.fn(),
		get: vi.fn(),
		delete: vi.fn().mockResolvedValue({}),
	};
	const tools = { execute: vi.fn() };
	return {
		connectedAccounts,
		tools,
		client: { connectedAccounts, tools } as unknown as TComposio,
	};
}

export type TMockComposio = ReturnType<typeof createMockComposio>;
