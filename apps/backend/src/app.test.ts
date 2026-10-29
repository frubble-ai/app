import { describe, expect, it } from "vitest";
import { app } from "./app.ts";

/** `Response.json()` is typed `unknown`; these shapes are what the routes promise. */
type HelloBody = {
	message: string;
	service: string;
	version: string;
	commit: string;
	environment: string;
};
type HealthBody = { status: string; uptime: number };
type ErrorBody = { error: string; path: string };

describe("GET /", () => {
	it("returns the hello world payload", async () => {
		const res = await app.request("/");
		expect(res.status).toBe(200);

		const body = (await res.json()) as HelloBody;
		expect(body.message).toBe("Hello World");
		expect(body.service).toBe("frubble-backend");
	});

	it("reports the build metadata it was given", async () => {
		const res = await app.request("/");
		const body = (await res.json()) as HelloBody;
		expect(body).toHaveProperty("version");
		expect(body).toHaveProperty("commit");
		expect(body).toHaveProperty("environment");
	});
});

describe("GET /health", () => {
	it("reports ok with an uptime", async () => {
		const res = await app.request("/health");
		expect(res.status).toBe(200);

		const body = (await res.json()) as HealthBody;
		expect(body.status).toBe("ok");
		expect(typeof body.uptime).toBe("number");
	});
});

describe("unknown routes", () => {
	it("404s with the offending path", async () => {
		const res = await app.request("/nope");
		expect(res.status).toBe(404);

		const body = (await res.json()) as ErrorBody;
		expect(body.error).toBe("not_found");
		expect(body.path).toBe("/nope");
	});
});
