import { vi } from "vitest";
import type { TTokenStore } from "../lib/token";

/** An in-memory `TTokenStore` whose calls are recorded. */
export function createMockTokenStore(): TTokenStore & {
	items: Map<string, string>;
} {
	const items = new Map<string, string>();
	return {
		items,
		getItem: vi.fn(async (key: string) => items.get(key) ?? null),
		setItem: vi.fn(async (key: string, value: string) => {
			items.set(key, value);
		}),
		deleteItem: vi.fn(async (key: string) => {
			items.delete(key);
		}),
	};
}
