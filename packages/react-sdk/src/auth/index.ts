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
	const { data, loading, refetch } = useMeQuery({
		fetchPolicy: "cache-first",
	});
	const me = data?.me ?? null;

	return {
		user: me,
		isAuthenticated: me !== null,
		isPending: loading && data === undefined,
		...useCodeActions(),
		...useSessionActions(refetch),
	};
}
