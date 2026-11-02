import { vi } from "vitest";

/** The GraphQL client module with every call recorded; `mutate` resolves unless a test says otherwise. */
export function createMockClient() {
	return {
		graphqlClient: {
			cache: { writeQuery: vi.fn() },
			mutate: vi.fn().mockResolvedValue({ data: {} }),
		},
	};
}
