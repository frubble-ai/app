import { faker } from "@faker-js/faker";
import type { TIntegrationProvider } from "@frubble/db";

/** The arguments of a broker's `startConnect`: an organization's attempt to connect a provider. */
export function generateConnectAttempt(
	overrides: Partial<{
		organizationId: string;
		provider: TIntegrationProvider;
		attemptId: string;
		callbackUrl: string;
	}> = {},
) {
	return {
		organizationId: faker.string.alphanumeric(32),
		provider: "github" as TIntegrationProvider,
		attemptId: faker.string.uuid(),
		callbackUrl: `${faker.internet.url()}/integrations/callback`,
		...overrides,
	};
}
