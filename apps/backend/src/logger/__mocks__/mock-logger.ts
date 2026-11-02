import { vi } from "vitest";

/** The app logger with every level a spy, so a test can see what was logged at which level. */
export const logger = {
	trace: vi.fn(),
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	fatal: vi.fn(),
};
