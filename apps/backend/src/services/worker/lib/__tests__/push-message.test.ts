import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { generatePushRequest } from "@/services/worker/__mocks__/generate-push-request";
import { InvalidMessageError } from "@/services/worker/lib/envelope";
import { parsePushMessage } from "@/services/worker/lib/push-message";

describe("parsePushMessage", () => {
	it("decodes the published JSON and keeps the message id", () => {
		const body = { type: "x", value: faker.number.int() };
		const request = generatePushRequest(body);

		expect(parsePushMessage(request)).toEqual({
			messageId: request.message.messageId,
			body,
		});
	});

	it.each([
		{ label: "not a push request", json: { hello: "world" } },
		{ label: "no message", json: { subscription: "s" } },
		{
			label: "data that is not JSON",
			json: generatePushRequest("x", {
				data: Buffer.from("{nope").toString("base64"),
			}),
		},
		{
			label: "no data at all",
			json: generatePushRequest("x", { data: undefined }),
		},
		{ label: "nothing", json: null },
	])("refuses $label as an invalid message", ({ json }) => {
		expect(() => parsePushMessage(json)).toThrow(InvalidMessageError);
	});
});
