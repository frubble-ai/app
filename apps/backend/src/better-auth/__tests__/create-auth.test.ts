import { createHmac } from "node:crypto";
import { faker } from "@faker-js/faker";
import { createDb } from "@frubble/db";
import pino from "pino";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAuth } from "@/better-auth";
import { buildTestConfig } from "@/testing/test-environment";

afterEach(() => {
	vi.restoreAllMocks();
});

describe("createAuth", () => {
	it("keeps a bearer token out of the logs when the session lookup fails", async () => {
		const config = buildTestConfig();
		// Nothing listens on port 1, so the lookup fails the way it does when the database is down.
		const db = createDb("postgres://user:pass@127.0.0.1:1/none", {
			onIdleClientError: () => {},
		});
		const lines: string[] = [];
		const logger = pino(
			{ level: "debug" },
			{ write: (line) => lines.push(line) },
		);
		const stderr = vi.spyOn(console, "error").mockImplementation(() => {});
		const auth = createAuth(db, config, logger);
		// The bearer plugin only looks a token up once its signature checks out.
		const token = faker.string.alphanumeric(40);
		const signature = createHmac("sha256", config.betterAuth.secret)
			.update(token)
			.digest("base64");
		const headers = new Headers({
			authorization: `Bearer ${encodeURIComponent(`${token}.${signature}`)}`,
		});

		await expect(auth.api.getSession({ headers })).rejects.toThrow();

		expect(stderr).not.toHaveBeenCalled();
		expect(lines.join("")).not.toContain(token);
		expect(lines.join("")).toContain("better-auth");
	});
});
