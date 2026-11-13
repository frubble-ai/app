import { z } from "zod";
import {
	passwordResetRequestedSchema,
	signupAccountExistsSchema,
	signupCodeRequestedSchema,
} from "../catalog/auth";
import type { TMessage, TMessageChannel, TMessagesOn } from "../catalog/index";
import { organizationInvitationSentSchema } from "../catalog/organizations";

/**
 * Every message on the wire is `{ version, id, occurredAt, ...message }`: the envelope version, the
 * message's own id (for logs and deduplication) and when it was sent.
 */
export const ENVELOPE_VERSION = 1;

const envelopeFields = {
	version: z.literal(ENVELOPE_VERSION),
	id: z.uuid(),
	occurredAt: z.iso.datetime(),
};

export type TEnvelope<TContent extends TMessage = TMessage> = TContent & {
	version: typeof ENVELOPE_VERSION;
	id: string;
	occurredAt: string;
};

/** Whose work a message is, read before its type is known: the consumer logs under its id. */
export const messageContextSchema = z.object({
	id: envelopeFields.id,
});

/**
 * What a consumer accepts on each channel: one of the channel's messages, in its envelope. Every
 * catalog message of the channel must be listed (the worker's tests send each one through).
 */
export const ENVELOPE_SCHEMAS = {
	emails: z.discriminatedUnion("type", [
		signupCodeRequestedSchema.extend(envelopeFields),
		signupAccountExistsSchema.extend(envelopeFields),
		passwordResetRequestedSchema.extend(envelopeFields),
		organizationInvitationSentSchema.extend(envelopeFields),
	]),
} satisfies {
	[TChannel in TMessageChannel]: z.ZodType<TEnvelope<TMessagesOn[TChannel]>>;
};

/** `message` in its envelope. */
export function wrapMessage<TContent extends TMessage>(
	message: TContent,
	context: { id: string; occurredAt: string },
): TEnvelope<TContent> {
	return {
		version: ENVELOPE_VERSION,
		id: context.id,
		occurredAt: context.occurredAt,
		...message,
	};
}
