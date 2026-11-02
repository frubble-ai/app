import { useCallback } from "react";
import { MeDocument, type MeQuery } from "../../gql/documents";
import { useSignInMutation, useSignUpMutation } from "../../gql/generated";
import { graphqlClient } from "../../gql/lib/client";
import { setToken } from "./token";

function warnRefetchFailed(error: unknown): void {
	console.warn("Refreshing the signed-in user failed", error);
}

/**
 * Ways to start a session: each stores the returned token and writes the returned user as `me`, so
 * the session holds as soon as the API answered; `refetch` then refreshes `me`, not waited on, and
 * its failure leaves the session as it is.
 */
export function useSessionActions(refetch: () => Promise<unknown>) {
	const [signUpMutation] = useSignUpMutation();
	const [signInMutation] = useSignInMutation();

	const startSession = useCallback(
		async <TSession extends { token: string; user: MeQuery["me"] }>(
			session?: TSession,
		) => {
			if (!session) throw new Error("The API returned no session");
			await setToken(session.token);
			graphqlClient.cache.writeQuery({
				query: MeDocument,
				data: { me: session.user },
			});
			void refetch().catch(warnRefetchFailed);
			return session;
		},
		[refetch],
	);

	const signUp = useCallback(
		async (input: {
			email: string;
			code: string;
			name: string;
			password: string;
		}) =>
			startSession(
				(await signUpMutation({ variables: { input } })).data?.signUp,
			),
		[signUpMutation, startSession],
	);

	const signIn = useCallback(
		async (input: { email: string; password: string }) =>
			startSession(
				(await signInMutation({ variables: { input } })).data?.signIn,
			),
		[signInMutation, startSession],
	);

	return { signUp, signIn };
}
