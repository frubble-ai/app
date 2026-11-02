import { faker } from "@faker-js/faker";
import { describe, expect, it, vi } from "vitest";
import { generatePushRequest } from "@/services/worker/__mocks__/generate-push-request";
import { buildWorkerApp } from "@/services/worker/app";
import { InvalidMessageError } from "@/services/worker/lib/envelope";
import { badInput } from "@/use-cases/lib/shared/domain-errors";

function setup() {
	const handleEmails = vi.fn().mockResolvedValue(undefined);
	return { app: buildWorkerApp({ handleEmails }), handleEmails };
}

function push(body: unknown) {
	return {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(generatePushRequest(body)),
	};
}

describe("the worker app", () => {
	it("acknowledges a message once its handler succeeded, handing it the decoded body", async () => {
		const { app, handleEmails } = setup();
		const body = {
			type: "signup.code_requested",
			code: faker.string.numeric(6),
		};

		const response = await app.request("/push/emails", push(body));

		expect(response.status).toBe(204);
		expect(handleEmails).toHaveBeenCalledWith(body);
	});

	it.each([
		{ label: "the handler fails", error: new Error("provider down") },
		{ label: "the message is invalid", error: new InvalidMessageError("bad") },
		{ label: "the handler refuses the input", error: badInput("nope") },
	])(
		"refuses the message when $label, so Pub/Sub redelivers it",
		async ({ error }) => {
			const { app, handleEmails } = setup();
			handleEmails.mockRejectedValueOnce(error);

			const response = await app.request("/push/emails", push({ type: "x" }));

			expect(response.status).toBe(500);
		},
	);

	it("answers 400 to a request that is not a push at all", async () => {
		const { app, handleEmails } = setup();

		const response = await app.request("/push/emails", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ hello: "world" }),
		});

		expect(response.status).toBe(400);
		expect(handleEmails).not.toHaveBeenCalled();
	});

	it("is healthy until it drains, then says so", async () => {
		const { app } = setup();

		expect((await app.request("/health")).status).toBe(200);

		app.markDraining();

		expect((await app.request("/health")).status).toBe(503);
	});

	it("answers an unknown path with a JSON 404", async () => {
		const { app } = setup();

		const response = await app.request("/nothing-here");

		expect(response.status).toBe(404);
	});

	it("refuses a push without the token when one is configured", async () => {
		const handleEmails = vi.fn().mockResolvedValue(undefined);
		const pushToken = faker.string.alphanumeric(40);
		const app = buildWorkerApp({ handleEmails, pushToken });
		const body = { type: "signup.code_requested", code: "123456" };

		const missing = await app.request("/push/emails", push(body));
		const wrong = await app.request("/push/emails?token=nope", push(body));
		const right = await app.request(
			`/push/emails?token=${pushToken}`,
			push(body),
		);

		expect(missing.status).toBe(401);
		expect(wrong.status).toBe(401);
		expect(right.status).toBe(204);
		expect(handleEmails).toHaveBeenCalledTimes(1);
	});
});
