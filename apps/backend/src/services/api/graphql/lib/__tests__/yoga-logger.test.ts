import { inspect } from "node:util";
import { faker } from "@faker-js/faker";
import { GraphQLError } from "graphql";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "@/logger";
import { createYogaLogger } from "@/services/api/graphql/lib/yoga-logger";

vi.mock("@/logger", async () => import("@/logger/__mocks__/mock-logger"));

beforeEach(() => {
	vi.clearAllMocks();
});

describe("the Yoga logger", () => {
	it.each([
		{ level: "debug", spy: () => logger.debug },
		{ level: "info", spy: () => logger.info },
		{ level: "warn", spy: () => logger.warn },
	] as const)("writes a $level line at the same level", ({ level, spy }) => {
		const message = faker.lorem.sentence();

		createYogaLogger()[level](message);

		expect(spy()).toHaveBeenCalledWith(expect.anything(), message);
	});

	it("logs a client's mistake at info, so real failures stand out", () => {
		const error = new GraphQLError("Authentication required", {
			extensions: { code: "UNAUTHENTICATED" },
		});

		createYogaLogger().error({ error }, "request failed");

		expect(logger.info).toHaveBeenCalledWith(
			expect.objectContaining({
				code: "UNAUTHENTICATED",
				err: expect.objectContaining({ message: "Authentication required" }),
			}),
			"request failed",
		);
		expect(logger.error).not.toHaveBeenCalled();
	});

	it("logs a server failure at error, with the error attached", () => {
		const error = new Error(faker.lorem.sentence());

		createYogaLogger().error({ error }, "request failed");

		expect(logger.error).toHaveBeenCalledWith(
			expect.objectContaining({
				err: expect.objectContaining({ message: error.message }),
			}),
			"request failed",
		);
	});

	it("logs an error line without an error object at error", () => {
		createYogaLogger().error("something odd");

		expect(logger.error).toHaveBeenCalledWith(
			expect.anything(),
			"something odd",
		);
	});

	it("does not log the cause of a masked error, where a query's parameters can sit", () => {
		const secret = faker.string.alphanumeric(40);
		const cause = new Error(`Failed query: select ... params: ${secret}`);
		const original = new Error("Failed to get session", { cause });
		const error = new GraphQLError("Unexpected error.", {
			originalError: original,
		});

		createYogaLogger().error({ error }, "request failed");

		expect(
			inspect(vi.mocked(logger.error).mock.calls, { depth: null }),
		).not.toContain(secret);
	});
});
