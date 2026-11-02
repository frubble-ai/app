import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { createMemoryTransport } from "../adapters/memory/index";
import { ENVELOPE_SCHEMAS, ENVELOPE_VERSION } from "../envelope/index";
import { createMessageBus } from "../message-bus/index";

function generateSignupCodeMessage() {
	return {
		type: "signup.code_requested" as const,
		email: faker.internet.email(),
		code: faker.string.numeric(6),
	};
}

describe("createMessageBus", () => {
	it("delivers an email message on the emails channel in a versioned envelope", async () => {
		const memory = createMemoryTransport();
		const bus = createMessageBus({ transport: memory.transport });
		const message = generateSignupCodeMessage();

		await bus.send(message);

		expect(memory.sentOn("emails")).toEqual([message]);
		const [envelope] = memory.delivered;
		expect(ENVELOPE_SCHEMAS.emails.parse(envelope)).toMatchObject({
			version: ENVELOPE_VERSION,
			...message,
		});
	});

	it("gives every message its own id", async () => {
		const memory = createMemoryTransport();
		const bus = createMessageBus({ transport: memory.transport });

		await bus.send(generateSignupCodeMessage());
		await bus.send(generateSignupCodeMessage());

		const ids = memory.delivered.map((envelope) => envelope.id);
		expect(new Set(ids).size).toBe(2);
	});

	it("refuses a message the catalog does not know, without delivering it", async () => {
		const memory = createMemoryTransport();
		const bus = createMessageBus({ transport: memory.transport });

		await expect(
			bus.send({ type: "unknown.thing" } as never),
		).rejects.toThrow();
		expect(memory.delivered).toEqual([]);
	});

	it("rejects when the transport does, so the caller knows the email will not go out", async () => {
		const memory = createMemoryTransport();
		const bus = createMessageBus({ transport: memory.transport });
		memory.failNext("emails");

		await expect(bus.send(generateSignupCodeMessage())).rejects.toThrow(
			/delivery failed/,
		);
		expect(memory.delivered).toEqual([]);
	});
});
