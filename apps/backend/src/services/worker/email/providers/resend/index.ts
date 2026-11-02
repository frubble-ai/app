import type {
	TEmailProviderConfig,
	TEmailSender,
} from "@/services/worker/email/providers";
import {
	DEFAULT_REQUEST_TIMEOUT_MS,
	renderForSending,
	sendFailed,
} from "@/services/worker/email/providers/lib/render";

const DEFAULT_API_URL = "https://api.resend.com";

/** Resend's emails API: JSON, a bearer key. The domain is implied by the sender address. */
export function createResendSender(
	config: TEmailProviderConfig,
	fetchImpl: typeof fetch,
): TEmailSender {
	const apiUrl = (config.apiUrl ?? DEFAULT_API_URL).replace(/\/+$/, "");

	return {
		async send(to, email, links = {}) {
			const { subject, html } = await renderForSending(email, links);
			const response = await fetchImpl(`${apiUrl}/emails`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${config.apiKey}`,
					"Content-Type": "application/json",
				},
				signal: AbortSignal.timeout(
					config.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
				),
				body: JSON.stringify({
					from: `${config.fromName} <${config.fromEmail}>`,
					to: [to],
					subject,
					html,
				}),
			});
			if (!response.ok) throw await sendFailed("Resend", response);
		},
	};
}
