import { IntegrationProvider } from "@frubble/react-sdk";

/** Every provider the page offers, in the order it lists them. */
export const PROVIDERS = [
	IntegrationProvider.Github,
	IntegrationProvider.Linear,
	IntegrationProvider.Slack,
] as const;

/** Lowercase, as the API's callback names a provider in the query (`?integration=github`). */
export function providerSlug(provider: IntegrationProvider): string {
	return provider.toLowerCase();
}
