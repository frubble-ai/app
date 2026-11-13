import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { buildYoga } from "@/services/api/graphql";

/** A browser's preflight for a credentialed POST to /graphql, sent from `origin`. */
function preflight(corsOrigin: string[], origin: string) {
	const yoga = buildYoga({ corsOrigin, trustedProxies: 1 });
	return yoga.fetch("http://localhost/graphql", {
		method: "OPTIONS",
		headers: {
			Origin: origin,
			"Access-Control-Request-Method": "POST",
			"Access-Control-Request-Headers": "content-type,authorization",
		},
	});
}

describe("GraphQL CORS", () => {
	it("sends no CORS headers when no origin is configured", async () => {
		const response = await preflight(
			[],
			faker.internet.url({ appendSlash: false }),
		);

		expect(response.headers.get("access-control-allow-origin")).toBeNull();
		expect(response.headers.get("access-control-allow-credentials")).toBeNull();
	});

	it("answers a configured origin with its CORS headers", async () => {
		const allowed = faker.internet.url({ appendSlash: false });

		const response = await preflight([allowed], allowed);

		expect(response.headers.get("access-control-allow-origin")).toBe(allowed);
		expect(response.headers.get("access-control-allow-credentials")).toBe(
			"true",
		);
	});

	it("does not echo an origin outside the configured ones", async () => {
		const allowed = faker.internet.url({ appendSlash: false });
		const stranger = `https://${faker.string.alpha(12).toLowerCase()}.example`;

		const response = await preflight([allowed], stranger);

		expect(response.headers.get("access-control-allow-origin")).toBe(allowed);
	});
});
