import {
	getSubject,
	renderEmail,
	type TEmail,
	type TEmailLinks,
} from "@frubble/emails";

// A stalled send fails (and the message is redelivered) instead of holding the worker.
export const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

/** The subject and HTML every adapter posts, whatever shape its API wants them in. */
export async function renderForSending(
	email: TEmail,
	links: TEmailLinks,
): Promise<{ subject: string; html: string }> {
	return {
		subject: getSubject(email.type),
		html: await renderEmail(email.type, { ...email.props, ...links }),
	};
}

/** A non-2xx answer as the error the worker logs; the body is cut so a long HTML page stays out of the log. */
export async function sendFailed(
	provider: string,
	response: Response,
): Promise<Error> {
	const body = await response.text().catch(() => "");
	return new Error(
		`${provider} send failed (${response.status}): ${body.slice(0, 300)}`,
	);
}
