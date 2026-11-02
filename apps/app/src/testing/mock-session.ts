import { vi } from "vitest";

/** `@/shared/session` with each step recorded: `vi.mock("@/shared/session", async () => import("@/testing/mock-session"))`. */
export const bootSession = vi.fn().mockResolvedValue(undefined);
export const endSession = vi.fn().mockResolvedValue(undefined);
