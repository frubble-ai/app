import { clearSession, graphqlClient, loadToken } from "@frubble/react-sdk";

function warnResetFailed(error: unknown): void {
	console.warn("Resetting the GraphQL cache failed", error);
}

/** Loads the saved session, once, before the first render asks who is signed in. */
export async function bootSession(): Promise<void> {
	await loadToken();
}

/**
 * Ends the session: signed out, or the API refused the token. The SDK clears it (the token, `me`, the
 * server session), then the cache forgets the user, not waited on.
 */
export async function endSession(): Promise<void> {
	await clearSession();
	void graphqlClient.resetStore().catch(warnResetFailed);
}
