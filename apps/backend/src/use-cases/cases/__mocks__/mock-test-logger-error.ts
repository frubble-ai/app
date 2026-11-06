import { vi } from "vitest";
import { testLogger } from "@/testing/test-logger";

/** A spy on the error level of the logger integration tests run with, to see what a use case logged. */
export function mockTestLoggerError() {
	return vi.spyOn(testLogger, "error");
}
