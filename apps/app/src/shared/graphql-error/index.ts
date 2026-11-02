import { CombinedGraphQLErrors } from "@apollo/client";

/** The API's error code (`extensions.code`) on a failed operation; null for a network failure. */
export function graphqlErrorCode(error: unknown): string | null {
	if (!CombinedGraphQLErrors.is(error)) return null;
	const code = error.errors[0]?.extensions?.code;
	return typeof code === "string" ? code : null;
}

/** What the API said went wrong; null for a network failure, which says nothing useful. */
export function graphqlErrorMessage(error: unknown): string | null {
	if (!CombinedGraphQLErrors.is(error)) return null;
	return error.errors[0]?.message ?? null;
}
