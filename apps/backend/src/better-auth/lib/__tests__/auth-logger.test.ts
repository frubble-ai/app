import { inspect } from "node:util";
import { faker } from "@faker-js/faker";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateSessionLookupError } from "@/better-auth/lib/__mocks__/generate-session-lookup-error";
import { createAuthLogger } from "@/better-auth/lib/auth-logger";
import { logger } from "@/logger";

vi.mock("@/logger", async () => import("@/logger/__mocks__/mock-logger"));

beforeEach(() => {
	vi.clearAllMocks();
});

/** Everything a logger spy was called with, as text, the way a log line would print it. */
function loggedText(spy: unknown): string {
	return inspect((spy as { mock: { calls: unknown[] } }).mock.calls, {
		depth: null,
	});
}

describe("createAuthLogger", () => {
	it.each([
		{ level: "debug", spy: () => logger.debug },
		{ level: "info", spy: () => logger.info },
		{ level: "warn", spy: () => logger.warn },
		{ level: "error", spy: () => logger.error },
	] as const)("writes a $level line at the same level", ({ level, spy }) => {
		const message = faker.lorem.sentence();

		createAuthLogger(logger).log?.(level, message);

		expect(spy()).toHaveBeenCalledWith(
			expect.objectContaining({ component: "better-auth" }),
			message,
		);
	});

	it("never writes the session token a failed lookup carried", () => {
		const { token, error } = generateSessionLookupError();

		createAuthLogger(logger).log?.("error", "INTERNAL_SERVER_ERROR", error);

		expect(loggedText(logger.error)).not.toContain(token);
	});

	it("never writes the query, its parameters, the stack or the cause", () => {
		const { error } = generateSessionLookupError();

		createAuthLogger(logger).log?.("error", "INTERNAL_SERVER_ERROR", error);

		const text = loggedText(logger.error);
		expect(text).not.toContain("select");
		expect(text).not.toContain("params");
		expect(text).not.toContain("at ");
		expect(text).not.toContain("ECONNREFUSED ");
	});

	it("writes the error's name and the driver's code, so a failure can still be told apart", () => {
		const { error } = generateSessionLookupError({ code: "57P01" });

		createAuthLogger(logger).log?.("error", "INTERNAL_SERVER_ERROR", error);

		expect(logger.error).toHaveBeenCalledWith(
			{ component: "better-auth", errorName: error.name, errorCode: "57P01" },
			"INTERNAL_SERVER_ERROR",
		);
	});

	it("handles Better Auth passing the error itself as the message", () => {
		const { token, error } = generateSessionLookupError();

		createAuthLogger(logger).log?.("error", error as unknown as string);

		expect(loggedText(logger.error)).not.toContain(token);
		expect(logger.error).toHaveBeenCalledWith(
			expect.objectContaining({ errorName: error.name }),
			"",
		);
	});

	it("drops a code that is not a short identifier", () => {
		const { token, error } = generateSessionLookupError({
			code: `bad code ${faker.string.alphanumeric(40)}`,
		});

		createAuthLogger(logger).log?.("error", "INTERNAL_SERVER_ERROR", error);

		expect(loggedText(logger.error)).not.toContain("bad code");
		expect(loggedText(logger.error)).not.toContain(token);
	});

	it("drops arguments that are not errors", () => {
		const secret = faker.string.alphanumeric(40);

		createAuthLogger(logger).log?.(
			"warn",
			"something",
			{ token: secret },
			secret,
		);

		expect(loggedText(logger.warn)).not.toContain(secret);
	});
});
