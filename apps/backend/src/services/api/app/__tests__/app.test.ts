import { describe, expect, it, vi } from "vitest";
import { buildApp, meta } from "@/services/api/app";

function appWithYoga() {
	const handle = vi.fn(
		async () => new Response(JSON.stringify({ data: { health: true } })),
	);
	return { app: buildApp({ yoga: { handle } }), handle };
}

describe("the HTTP app", () => {
	it("tells the deploy which commit it serves", async () => {
		const { app } = appWithYoga();

		const response = await app.request("/");

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			service: "frubble-api",
			commit: meta.commit,
			version: meta.version,
		});
	});

	it("answers the health check without touching anything", async () => {
		const { app } = appWithYoga();

		const response = await app.request("/health");

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ status: "ok" });
	});

	it("hands GraphQL requests to Yoga", async () => {
		const { app, handle } = appWithYoga();

		const response = await app.request("/graphql", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ query: "{ health }" }),
		});

		expect(handle).toHaveBeenCalledTimes(1);
		expect(await response.json()).toEqual({ data: { health: true } });
	});

	it("answers an unknown path with a JSON 404", async () => {
		const { app } = appWithYoga();
		const path = `/${crypto.randomUUID()}`;

		const response = await app.request(path);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "not_found", path });
	});

	it("answers a crash with a JSON 500 that says nothing else", async () => {
		const app = buildApp({
			yoga: {
				handle: () => {
					throw new Error("secret details");
				},
			},
		});

		const response = await app.request("/graphql", { method: "POST" });

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ error: "internal_error" });
	});
});
