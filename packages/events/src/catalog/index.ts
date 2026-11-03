import { z } from "zod";
import {
	passwordResetRequestedSchema,
	signupCodeRequestedSchema,
} from "./auth";
import { organizationInvitationSentSchema } from "./organizations";

// The catalog: every message the API may send, one file per domain. Messages may carry personal
// data (an address, a code): they are consumed once and never stored.

export * from "./auth";
export * from "./organizations";

/** Every email; the channel `emails` carries them. */
export const EMAIL_MESSAGE_SCHEMAS = [
	signupCodeRequestedSchema,
	passwordResetRequestedSchema,
	organizationInvitationSentSchema,
] as const;

export const emailMessageSchema = z.discriminatedUnion(
	"type",
	EMAIL_MESSAGE_SCHEMAS,
);

export type TEmailMessage = z.infer<typeof emailMessageSchema>;

export const messageSchema = z.discriminatedUnion("type", [
	...EMAIL_MESSAGE_SCHEMAS,
]);

export type TMessage = z.infer<typeof messageSchema>;

/** Which messages travel on each channel. */
export type TMessagesOn = {
	emails: TEmailMessage;
};

export type TMessageChannel = keyof TMessagesOn;

/** The channel a message travels on. */
export function channelOf(_message: TMessage): TMessageChannel {
	return "emails";
}
