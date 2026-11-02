import type {
	TEmailProviderConfig,
	TEmailSender,
} from "@/services/worker/email/providers";
import {
	DEFAULT_REQUEST_TIMEOUT_MS,
	renderForSending,
	sendFailed,
} from "@/services/worker/email/providers/lib/render";

const DEFAULT_API_URL = "https://api.mailgun.net";

/** Mailgun's messages API: form fields, HTTP basic auth with the sending key, one call per domain. */
export function createMailgunSender(
	config: TEmailProviderConfig,
	fetchImpl: typeof fetch,
): TEmailSender {
	const apiUrl = (config.apiUrl ?? DEFAULT_API_URL).replace(/\/+$/, "");
	const authorization = `Basic ${Buffer.from(`api:${config.apiKey}`).toString("base64")}`;

	return {
		async send(to, email, links = {}) {
			const { subject, html } = await renderForSending(email, links);
			const form = new URLSearchParams({
				from: `${config.fromName} <${config.fromEmail}>`,
				to,
				subject,
				html,
			});
			const response = await fetchImpl(
				`${apiUrl}/v3/${config.domain}/messages`,
				{
					method: "POST",
					headers: {
						Authorization: authorization,
						"Content-Type": "application/x-www-form-urlencoded",
					},
					signal: AbortSignal.timeout(
						config.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
					),
					body: form,
				},
			);
			if (!response.ok) throw await sendFailed("Mailgun", response);
		},
	};
}
