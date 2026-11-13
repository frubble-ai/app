import {
	clearSession,
	getToken,
	graphqlClient,
	loadToken,
	TOKEN_KEY,
} from "@frubble/react-sdk";

function warnResetFailed(error: unknown): void {
	console.warn("Resetting the GraphQL cache failed", error);
}

let watching = false;

/**
 * Another tab signing out removes the token from `localStorage`, and the browser tells the other
 * tabs. Those still hold the user in memory and in the cache, so they end the session too, without
 * asking the server again: the first tab already revoked it.
 */
function watchOtherTabs(): void {
	if (watching) return;
	watching = true;
	window.addEventListener("storage", (event) => {
		const tokenGone =
			event.storageArea === window.localStorage &&
			(event.key === TOKEN_KEY || event.key === null) &&
			event.newValue === null;
		if (tokenGone && getToken()) void endSession({ revoke: false });
	});
}

/** Loads the saved session, once, before the first render asks who is signed in. */
export async function bootSession(): Promise<void> {
	watchOtherTabs();
	await loadToken();
}

/**
 * Ends the session: signed out, or the API refused the token. The SDK clears it (the token, `me`, the
 * server session unless `revoke` is false), then the cache forgets the user, not waited on.
 */
export async function endSession({
	revoke = true,
}: {
	revoke?: boolean;
} = {}): Promise<void> {
	await clearSession({ revoke });
	void graphqlClient.resetStore().catch(warnResetFailed);
}
