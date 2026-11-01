import type { z } from "zod";

/** A message that is not a valid envelope; it is left for the dead-letter policy. */
export class InvalidMessageError extends Error {
	constructor(readonly issues: unknown) {
		super("Invalid queue message");
		this.name = "InvalidMessageError";
	}
}

/** A message body as JSON; anything else is an invalid message. */
export function parseMessageBody(body: string | undefined): unknown {
	try {
		return JSON.parse(body ?? "");
	} catch {
		throw new InvalidMessageError("body is not JSON");
	}
}

/** A parsed message body as `schema` (an `@frubble/events` envelope). */
export function parseEnvelope<TEnvelope>(
	json: unknown,
	schema: z.ZodType<TEnvelope>,
): TEnvelope {
	const parsed = schema.safeParse(json);
	if (!parsed.success) throw new InvalidMessageError(parsed.error.issues);
	return parsed.data;
}
