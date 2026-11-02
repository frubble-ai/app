import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { buildAppConfig } from "@/config/app-config";
import { contentSecurityPolicy, proxy } from "@/proxy";

describe("proxy", () => {
	const before = {
		APP_ENV: process.env.APP_ENV,
		GRAPHQL_URL: process.env.GRAPHQL_URL,
	};
	afterEach(() => {
		for (const [key, value] of Object.entries(before)) {
			if (value === undefined) Reflect.deleteProperty(process.env, key);
			else process.env[key] = value;
		}
	});

	it("lets every page through, with its Content-Security-Policy", () => {
		process.env.APP_ENV = "prd";
		process.env.GRAPHQL_URL = "https://api.example.test/graphql";

		const response = proxy(new NextRequest("https://app.test/sign-in"));

		expect(response.headers.get("x-middleware-next")).toBe("1");
		expect(response.headers.get("Content-Security-Policy")).toMatch(
			/script-src 'self' 'nonce-[^']+' 'strict-dynamic';/,
		);
	});

	it("gives every request a fresh nonce", () => {
		const nonceOf = () =>
			proxy(new NextRequest("https://app.test/"))
				.headers.get("Content-Security-Policy")
				?.match(/'nonce-([^']+)'/)?.[1];

		expect(nonceOf()).not.toBe(nonceOf());
	});
});

describe("contentSecurityPolicy", () => {
	const prd = buildAppConfig({
		APP_ENV: "prd",
		GRAPHQL_URL: "https://api.example.test/graphql",
	});

	it("lets the page talk only to its origin and its API", () => {
		expect(contentSecurityPolicy(prd, "n0nce", false)).toContain(
			"connect-src 'self' https://api.example.test;",
		);
	});

	it("runs only the page's own scripts, and never in a frame", () => {
		const policy = contentSecurityPolicy(prd, "n0nce", false);

		expect(policy).toContain(
			"script-src 'self' 'nonce-n0nce' 'strict-dynamic';",
		);
		expect(policy).toContain("frame-ancestors 'none'");
		expect(policy).toContain("object-src 'none'");
		expect(policy).toContain("upgrade-insecure-requests");
	});

	it("allows eval for React's dev build only, and plain HTTP locally", () => {
		const local = buildAppConfig({});
		const policy = contentSecurityPolicy(local, "n0nce", true);

		expect(policy).toContain("'unsafe-eval'");
		expect(policy).toContain("connect-src 'self' http://localhost:8080;");
		expect(policy).not.toContain("upgrade-insecure-requests");
	});
});
