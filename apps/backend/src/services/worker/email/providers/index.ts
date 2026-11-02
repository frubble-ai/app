import type { TEmail, TEmailLinks } from "@frubble/emails";
import { createMailgunSender } from "./mailgun/index";
import { createResendSender } from "./resend/index";

/** What the worker needs from a provider: send one rendered email, or throw so it is retried. */
export type TEmailSender = {
	send(to: string, email: TEmail, links?: TEmailLinks): Promise<void>;
};

/** The providers the worker ships an adapter for. */
export const EMAIL_PROVIDERS = ["mailgun", "resend"] as const;
export type TEmailProvider = (typeof EMAIL_PROVIDERS)[number];

/** What every adapter is given; a provider reads the parts it needs. */
export type TEmailProviderConfig = {
	apiKey: string;
	/** The provider's API origin; each adapter has its own default. */
	apiUrl: string | undefined;
	/** The sending domain, registered at the provider. */
	domain: string;
	fromEmail: string;
	fromName: string;
	requestTimeoutMs?: number;
};

type TSenderFactory = (
	config: TEmailProviderConfig,
	fetchImpl: typeof fetch,
) => TEmailSender;

const SENDERS: Record<TEmailProvider, TSenderFactory> = {
	mailgun: createMailgunSender,
	resend: createResendSender,
};

/** The adapter for `provider`. Adding a provider is one folder here and one entry in this table. */
export function createEmailSender(
	provider: TEmailProvider,
	config: TEmailProviderConfig,
	fetchImpl: typeof fetch = fetch,
): TEmailSender {
	return SENDERS[provider](config, fetchImpl);
}
