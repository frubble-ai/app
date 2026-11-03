import { vi } from "vitest";
import type { TIntegrationsClient } from "@/composio";

/** A Composio stand-in: each call is a `vi.fn()` a test sets up. */
export function createMockIntegrationsClient() {
	return {
		link: vi.fn<TIntegrationsClient["link"]>(),
		getState: vi.fn<TIntegrationsClient["getState"]>(),
		remove: vi.fn<TIntegrationsClient["remove"]>().mockResolvedValue(undefined),
		preview: vi.fn<TIntegrationsClient["preview"]>(),
	} satisfies TIntegrationsClient;
}

export type TMockIntegrationsClient = ReturnType<
	typeof createMockIntegrationsClient
>;
