import { faker } from "@faker-js/faker";
import type { TConnectionRef } from "@/integrations";

/** A connected account's id as Composio makes them. */
export function generateComposioConnectedAccountId(): string {
	return `ca_${faker.string.alphanumeric(10)}`;
}

/** An organization's connection with its Composio connected account. */
export function generateComposioConnection(
	overrides: Partial<TConnectionRef> = {},
): TConnectionRef {
	return {
		organizationId: faker.string.alphanumeric(32),
		accountRef: generateComposioConnectedAccountId(),
		...overrides,
	};
}
