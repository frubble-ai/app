import { vi } from "vitest";

/**
 * `@frubble/react-sdk` with the hooks screens call replaced by `vi.fn()`s; the rest (enums,
 * documents) is the real thing. Usage: `vi.mock("@frubble/react-sdk", async () =>
 * import("@/testing/mock-react-sdk"))`, then drive them with `vi.mocked(useAuth).mockReturnValue(…)`.
 */
const actual =
	await vi.importActual<typeof import("@frubble/react-sdk")>(
		"@frubble/react-sdk",
	);

export * from "@frubble/react-sdk";
export const graphqlClient = actual.graphqlClient;
export const useAuth = vi.fn();
