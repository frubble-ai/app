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

const bearer = () => {
	const token = getToken();
	return token ? `Bearer ${token}` : undefined;
};

/** A token was sent and refused: the session is over, whichever operation found out. */
const sessionLink = new ErrorLink(({ error, operation }) => {
	if (
		operation.getContext().sentToken === true &&
		CombinedGraphQLErrors.is(error) &&
		error.errors.some(
			(graphqlError) => graphqlError.extensions?.code === "UNAUTHENTICATED",
		)
	) {
		configured().onUnauthenticated?.();
	}
});

const headersLink = new SetContextLink((previous) => {
	const authorization = bearer();
	return {
		sentToken: authorization !== undefined,
		headers: {
			...previous.headers,
			...(authorization ? { Authorization: authorization } : {}),
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
