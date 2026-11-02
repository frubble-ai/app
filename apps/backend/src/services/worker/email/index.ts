import type { TEmail } from "@frubble/emails";
import { ENVELOPE_SCHEMAS, type TEmailMessage } from "@frubble/events";
import type { TLogger } from "@/logger";
import { parseEnvelope } from "@/services/worker/lib/envelope";

export interface IEmailDeps {
	logger: TLogger;
	sendEmail(to: string, email: TEmail): Promise<void>;
}

function assertNever(value: never): never {
	throw new Error(
		`Unhandled email message: ${JSON.stringify((value as { type?: string }).type ?? "<missing>")}`,
	);
}

/** The email to render for a message. */
export function toEmail(message: TEmailMessage): TEmail {
	switch (message.type) {
		case "signup.code_requested":
			return {
				type: message.type,
				props: { code: message.code },
			};
		case "password.reset_requested":
			return { type: message.type, props: { code: message.code } };
		default:
			return assertNever(message);
	}
}

/** One `emails` message (its parsed body): render the template and send it. Throws to retry. */
export async function handleEmailMessage(
	deps: IEmailDeps,
	body: unknown,
): Promise<void> {
	const message = parseEnvelope(body, ENVELOPE_SCHEMAS.emails);
	await deps.sendEmail(message.email, toEmail(message));
	// The template only: never the address or the code.
	deps.logger.info(
		{ template: message.type, messageId: message.id },
		"email sent",
	);
}
