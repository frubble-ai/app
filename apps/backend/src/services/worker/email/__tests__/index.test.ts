import { faker } from "@faker-js/faker";
import type { TEmailMessage } from "@frubble/events";
import { EMAIL_MESSAGE_SCHEMAS } from "@frubble/events";
import { describe, expect, it, vi } from "vitest";
import { handleEmailMessage, toEmail } from "@/services/worker/email";
import {
	generateEmailMessageCases,
	generateEnvelope,
	generateSignupCodeMessage,
} from "@/services/worker/email/__mocks__/generate-email-messages";
import { InvalidMessageError } from "@/services/worker/lib/envelope";
import { testLogger } from "@/testing/test-logger";

function setup() {
	const sendEmail = vi.fn().mockResolvedValue(undefined);
	return { deps: { logger: testLogger, sendEmail }, sendEmail };
}

describe("toEmail", () => {
	it.each(generateEmailMessageCases())(
		"builds the email for $message.type",
		({ message, email }) => {
			expect(toEmail(message)).toEqual(email);
		},
	);

	it("refuses a message kind it does not know", () => {
		expect(() =>
			toEmail({ type: "unknown.thing" } as unknown as TEmailMessage),
		).toThrow(/Unhandled email message/);
	});
});

describe("handleEmailMessage", () => {
	it("sends the email the message asks for, to its address", async () => {
		const { deps, sendEmail } = setup();
		const message = generateSignupCodeMessage();

		await handleEmailMessage(deps, generateEnvelope(message));

		expect(sendEmail).toHaveBeenCalledWith(message.email, toEmail(message));
	});

	it("accepts every email the catalog has, in its envelope", async () => {
		const cases = generateEmailMessageCases();
		expect(cases.map(({ message }) => message.type).sort()).toEqual(
			EMAIL_MESSAGE_SCHEMAS.map((schema) => schema.shape.type.value).sort(),
		);
		for (const { message, email } of cases) {
			const { deps, sendEmail } = setup();

			await handleEmailMessage(deps, generateEnvelope(message));

			expect(sendEmail).toHaveBeenCalledWith(message.email, email);
		}
	});

	it("rethrows a failed send, so the message is redelivered", async () => {
		const { deps, sendEmail } = setup();
		const failure = new Error(faker.lorem.sentence());
		sendEmail.mockRejectedValueOnce(failure);

		await expect(
			handleEmailMessage(deps, generateEnvelope(generateSignupCodeMessage())),
		).rejects.toBe(failure);
	});

	it.each([
		{ label: "an unknown type", body: () => ({ type: "trial.nudge" }) },
		{
			label: "a known type without its envelope",
			body: () => generateSignupCodeMessage(),
		},
		{
			label: "a known type missing a field",
			body: () =>
				generateEnvelope({
					...generateSignupCodeMessage(),
					email: undefined,
				} as unknown as TEmailMessage),
		},
	])(
		"refuses $label as an invalid message, sending nothing",
		async ({ body }) => {
			const { deps, sendEmail } = setup();

			await expect(handleEmailMessage(deps, body())).rejects.toBeInstanceOf(
				InvalidMessageError,
			);
			expect(sendEmail).not.toHaveBeenCalled();
		},
	);
});
