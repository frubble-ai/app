import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import type { TRateLimitRule } from "@/config";
import { setupIntegrationTestContext } from "@/testing/setup-integration-test-context";
import {
	authRateLimitChecks,
	clientIpFromHeaders,
	enforceRateLimits,
} from "@/use-cases/lib/auth/rate-limit";
import { retryAfterSeconds } from "@/use-cases/lib/shared/domain-errors";

const { getClone } = setupIntegrationTestContext();

const RULE: TRateLimitRule = { limit: 3, windowMs: 60_000 };

function newKey(): string {
	return `test:${faker.string.alphanumeric(12)}`;
}

describe("enforceRateLimits", () => {
	it("allows attempts up to the limit and refuses the next, saying how long to wait", async () => {
		const db = getClone().db;
		const key = newKey();

		for (let attempt = 0; attempt < RULE.limit; attempt++) {
			await enforceRateLimits(db, [{ key, rule: RULE }]);
		}

		let caught: unknown;
		await enforceRateLimits(db, [{ key, rule: RULE }]).catch((error) => {
			caught = error;
		});
		expect(caught).toMatchObject({ name: "TooManyRequestsError" });
		const wait = retryAfterSeconds(caught);
		expect(wait).toBeGreaterThan(0);
		expect(wait).toBeLessThanOrEqual(RULE.windowMs / 1000);
	});

	it("counts each key on its own", async () => {
		const db = getClone().db;
		const first = newKey();
		const second = newKey();
		for (let attempt = 0; attempt < RULE.limit; attempt++) {
			await enforceRateLimits(db, [{ key: first, rule: RULE }]);
		}

		await expect(
			enforceRateLimits(db, [{ key: second, rule: RULE }]),
		).resolves.toBeUndefined();
	});

	it("refuses when any of several keys is over its limit", async () => {
		const db = getClone().db;
		const limited = newKey();
		const fresh = newKey();
		for (let attempt = 0; attempt < RULE.limit; attempt++) {
			await enforceRateLimits(db, [{ key: limited, rule: RULE }]);
		}

		await expect(
			enforceRateLimits(db, [
				{ key: fresh, rule: RULE },
				{ key: limited, rule: RULE },
			]),
		).rejects.toMatchObject({ name: "TooManyRequestsError" });
	});

	it("starts a new window once the old one has passed", async () => {
		const db = getClone().db;
		const key = newKey();
		const shortRule: TRateLimitRule = { limit: 1, windowMs: 1 };
		await enforceRateLimits(db, [{ key, rule: shortRule }]);
		await new Promise((resolve) => setTimeout(resolve, 5));

		await expect(
			enforceRateLimits(db, [{ key, rule: shortRule }]),
		).resolves.toBeUndefined();
	});
});

describe("authRateLimitChecks", () => {
	const rules = { perEmail: RULE, perIp: { limit: 10, windowMs: 60_000 } };

	it("limits by email and by address when both are known", () => {
		const email = faker.internet.email().toLowerCase();
		const clientIp = faker.internet.ipv4();

		expect(authRateLimitChecks(rules, "sign-in", { email, clientIp })).toEqual([
			{ key: `sign-in:email:${email}`, rule: rules.perEmail },
			{ key: `sign-in:ip:${clientIp}`, rule: rules.perIp },
		]);
	});

	it("limits by email alone without an address", () => {
		const email = faker.internet.email().toLowerCase();

		expect(authRateLimitChecks(rules, "sign-up", { email })).toEqual([
			{ key: `sign-up:email:${email}`, rule: rules.perEmail },
		]);
	});
});

describe("clientIpFromHeaders", () => {
	it("takes the entry before the load balancer's own, which it appends last", () => {
		const client = faker.internet.ipv4();
		const balancer = faker.internet.ipv4();
		const headers = new Headers({
			"x-forwarded-for": `${faker.internet.ipv4()}, ${client}, ${balancer}`,
		});

		expect(clientIpFromHeaders(headers, 1)).toBe(client);
	});

	it("ignores what a client put in the header itself", () => {
		const client = faker.internet.ipv4();
		const headers = new Headers({
			"x-forwarded-for": `1.1.1.1, 2.2.2.2, ${client}, ${faker.internet.ipv4()}`,
		});

		expect(clientIpFromHeaders(headers, 1)).toBe(client);
	});

	it("counts as many proxies as are trusted", () => {
		const client = faker.internet.ipv4();
		const headers = new Headers({
			"x-forwarded-for": `${client}, ${faker.internet.ipv4()}, ${faker.internet.ipv4()}`,
		});

		expect(clientIpFromHeaders(headers, 2)).toBe(client);
	});

	it.each([
		{ label: "no header", headers: new Headers(), proxies: 1 },
		{
			label: "only the proxy's entry",
			headers: new Headers({ "x-forwarded-for": "9.9.9.9" }),
			proxies: 1,
		},
	])("is undefined with $label", ({ headers, proxies }) => {
		expect(clientIpFromHeaders(headers, proxies)).toBeUndefined();
	});
});
