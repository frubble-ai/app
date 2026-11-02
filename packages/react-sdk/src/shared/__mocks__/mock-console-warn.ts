import { vi } from "vitest";

export function mockConsoleWarn() {
	return vi.spyOn(console, "warn").mockImplementation(() => undefined);
}
