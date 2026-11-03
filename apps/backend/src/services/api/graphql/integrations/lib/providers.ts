import type { TIntegrationProvider } from "@frubble/db";
import { IntegrationProvider } from "@frubble/gql/types";

const PROVIDER_FROM_GQL: Record<IntegrationProvider, TIntegrationProvider> = {
	[IntegrationProvider.Github]: "github",
	[IntegrationProvider.Linear]: "linear",
	[IntegrationProvider.Slack]: "slack",
};

const PROVIDER_TO_GQL: Record<TIntegrationProvider, IntegrationProvider> = {
	github: IntegrationProvider.Github,
	linear: IntegrationProvider.Linear,
	slack: IntegrationProvider.Slack,
};

export function fromGqlProvider(
	provider: IntegrationProvider,
): TIntegrationProvider {
	return PROVIDER_FROM_GQL[provider];
}

export function toGqlProvider(
	provider: TIntegrationProvider,
): IntegrationProvider {
	return PROVIDER_TO_GQL[provider];
}
