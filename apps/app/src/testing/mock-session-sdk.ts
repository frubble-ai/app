import { vi } from "vitest";
import { browserTokenStore } from "@/shared/token-store";

/**
 * `@frubble/react-sdk` with its real token handling (on the browser's store) and the session
 * steps recorded: for the session's own tests, which check what starting and ending one ask of it.
 */
const actual =
	await vi.importActual<typeof import("@frubble/react-sdk")>(
		"@frubble/react-sdk",
	);
actual.configureTokenStore(browserTokenStore);

export * from "@frubble/react-sdk";
export const clearSession = vi.fn().mockResolvedValue(undefined);
export const graphqlClient = { resetStore: vi.fn().mockResolvedValue([]) };
