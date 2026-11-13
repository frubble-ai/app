import { MeDocument, SignOutDocument } from "../../gql/documents";
import { graphqlClient } from "../../gql/lib/client";
import { clearToken, getToken } from "./token";

function warnSignOutFailed(error: unknown): void {
	console.warn("Server sign-out failed", error);
}

/**
 * Ends the session on this device: the token goes and `me` is nobody at once, and the server session
 * is revoked in the background with the token just cleared. What the app holds of the member (its
 * stores, the cache's other queries) is the app's to forget after. `revoke: false` leaves the server
 * alone, for a device that learns another one already signed out.
 */
export async function clearSession({
	revoke = true,
}: {
	revoke?: boolean;
} = {}): Promise<void> {
	const token = getToken();
	await clearToken();
	graphqlClient.cache.writeQuery({ query: MeDocument, data: { me: null } });
	if (token && revoke) {
		void graphqlClient
			.mutate({
				mutation: SignOutDocument,
				context: { headers: { Authorization: `Bearer ${token}` } },
			})
			.catch(warnSignOutFailed);
	}
}
