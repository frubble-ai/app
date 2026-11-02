import { vi } from "vitest";

export function createMockToken() {
	return {
		setToken: vi.fn().mockResolvedValue(undefined),
		getToken: vi.fn().mockReturnValue(null),
		clearToken: vi.fn().mockResolvedValue(undefined),
	};
}
