import { useMeQuery } from "../gql/generated";
import { useCodeActions } from "./lib/use-code-actions";
import { useSessionActions } from "./lib/use-session-actions";

export { clearSession } from "./lib/clear-session";
export type { TTokenStore } from "./lib/token";
export {
	clearToken,
	configureTokenStore,
	getToken,
	loadToken,
	setToken,
} from "./lib/token";

/** The signed-in user, and the actions that start, change and end a session. */
export function useAuth() {
	const { data, loading, error, refetch } = useMeQuery({
		fetchPolicy: "cache-first",
	});
	const me = data?.me ?? null;

	return {
		user: me,
		role: me?.role ?? null,
		isAuthenticated: me !== null,
		isPending: loading && data === undefined,
		/** The API couldn't say who is signed in (a network failure): not the same as signed out. */
		isUnknown: error !== undefined && data === undefined,
		/** Asks the API again who is signed in. */
		retry: () => void refetch().catch(() => undefined),
		...useCodeActions(),
		...useSessionActions(refetch),
	};
}
