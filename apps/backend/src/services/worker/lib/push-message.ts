import { z } from "zod";
import {
	InvalidMessageError,
	parseMessageBody,
} from "@/services/worker/lib/envelope";

/** What Pub/Sub posts to a push endpoint: the message, its data base64-encoded. */
const pushRequestSchema = z.object({
	message: z.object({
		data: z.string().optional(),
		messageId: z.string(),
		attributes: z.record(z.string(), z.string()).optional(),
	}),
	subscription: z.string(),
});

export type TPushMessage = {
	messageId: string;
	/** The published JSON, decoded. */
	body: unknown;
};

/** The published message out of a push request; a request that is not one is an invalid message. */
export function parsePushMessage(json: unknown): TPushMessage {
	const parsed = pushRequestSchema.safeParse(json);
	if (!parsed.success) throw new InvalidMessageError(parsed.error.issues);
	const { message } = parsed.data;
	const data = message.data
		? Buffer.from(message.data, "base64").toString("utf8")
		: undefined;
	return { messageId: message.messageId, body: parseMessageBody(data) };
}
