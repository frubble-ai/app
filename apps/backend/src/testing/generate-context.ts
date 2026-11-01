import { faker } from "@faker-js/faker";
import type { TGraphqlContext } from "@/services/api/graphql";

/** A GraphQL context for resolver tests; signed out unless a user is given. */
export function generateContext(
	overrides: Partial<TGraphqlContext> = {},
): TGraphqlContext {
	return {
		user: null,
		requestHeaders: new Headers({ "x-request-id": faker.string.uuid() }),
		clientIp: faker.internet.ipv4(),
		...overrides,
	};
}
