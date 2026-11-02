import {
	ApolloClient,
	ApolloLink,
	CombinedGraphQLErrors,
	HttpLink,
	InMemoryCache,
} from "@apollo/client";
import { SetContextLink } from "@apollo/client/link/context";
import { ErrorLink } from "@apollo/client/link/error";
import { getToken } from "../../auth/lib/token";

type TGraphqlConfig = {
	endpoint: string;
	onUnauthenticated?: () => void;
};

let config: TGraphqlConfig | undefined;

/**
 * `endpoint`: the GraphQL URL. `onUnauthenticated`: called when the API refuses the session token
 * (expired or revoked).
 */
export function configureGraphql(next: TGraphqlConfig) {
	config = next;
}

function configured(): TGraphqlConfig {
	if (!config) {
		throw new Error(
			"GraphQL not configured. Call configureGraphql({ endpoint }) before any operation.",
		);
	}
	return config;
}

/**
 * The token sent was refused: that session is over, whichever operation found out. Only when it is
 * still the current one: a request sent before a sign-in can fail after it, and must not end the
 * new session.
 */
const sessionLink = new ErrorLink(({ error, operation }) => {
	const sentToken: unknown = operation.getContext().sentToken;
	if (
		typeof sentToken === "string" &&
		sentToken === getToken() &&
		CombinedGraphQLErrors.is(error) &&
		error.errors.some(
			(graphqlError) => graphqlError.extensions?.code === "UNAUTHENTICATED",
		)
	) {
		configured().onUnauthenticated?.();
	}
});

const headersLink = new SetContextLink((previous) => {
	// A caller that names its own token (sign-out revokes the session it is leaving) keeps it
	const explicit: unknown =
		previous.headers?.Authorization ?? previous.headers?.authorization;
	if (typeof explicit === "string") {
		return { sentToken: explicit.replace(/^bearer\s+/i, "").trim() };
	}
	const token = getToken();
	return {
		sentToken: token ?? undefined,
		headers: {
			...previous.headers,
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
	};
});

const httpLink = new HttpLink({ uri: () => configured().endpoint });

/** The app's GraphQL client and cache, one for its lifetime. */
export const graphqlClient = new ApolloClient({
	link: ApolloLink.from([sessionLink, headersLink, httpLink]),
	cache: new InMemoryCache(),
	defaultOptions: {
		watchQuery: { fetchPolicy: "cache-and-network" },
	},
});
