import { faker } from "@faker-js/faker";
import type { TEmail } from "@frubble/emails";
import type { TEmailMessage, TEnvelope } from "@frubble/events";
import { ENVELOPE_VERSION } from "@frubble/events";
import { DateTime } from "luxon";

/** `message` in the envelope the API would have put it in. */
export function generateEnvelope<TMessage extends TEmailMessage>(
	message: TMessage,
): TEnvelope<TMessage> {
	return {
		version: ENVELOPE_VERSION,
		id: faker.string.uuid(),
		occurredAt: DateTime.utc().toISO(),
		...message,
	};
}

export function generateSignupCodeMessage(): TEmailMessage {
	return {
		type: "signup.code_requested",
		email: faker.internet.email().toLowerCase(),
		code: faker.string.numeric(6),
		isAdminInvite: false,
	};
}

export function generatePasswordResetMessage(): TEmailMessage {
	return {
		type: "password.reset_requested",
		email: faker.internet.email().toLowerCase(),
		code: faker.string.numeric(6),
	};
}

/** One message of every kind, with the email the worker should render for it. */
export function generateEmailMessageCases(): Array<{
	message: TEmailMessage;
	email: TEmail;
}> {
	const code = faker.string.numeric(6);
	const resetCode = faker.string.numeric(6);
	const address = faker.internet.email().toLowerCase();
	return [
		{
			message: {
				type: "signup.code_requested",
				email: address,
				code,
				isAdminInvite: false,
			},
			email: {
				type: "signup.code_requested",
				props: { code, isAdminInvite: false },
			},
		},
		{
			message: {
				type: "signup.code_requested",
				email: address,
				code,
				isAdminInvite: true,
			},
			email: {
				type: "signup.code_requested",
				props: { code, isAdminInvite: true },
			},
		},
		{
			message: {
				type: "password.reset_requested",
				email: address,
				code: resetCode,
			},
			email: { type: "password.reset_requested", props: { code: resetCode } },
		},
	];
}
