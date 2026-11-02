import { useCallback } from "react";
import { useSignInMutation, useSignUpMutation } from "../../gql/generated";
import { setToken } from "./token";

/** Ways to start a session: each stores the returned token, then `refetch`es `me`. */
export function useSessionActions(refetch: () => Promise<unknown>) {
	const [signUpMutation] = useSignUpMutation();
	const [signInMutation] = useSignInMutation();

	const startSession = useCallback(
		async <TSession extends { token: string }>(session?: TSession) => {
			if (!session) throw new Error("The API returned no session");
			await setToken(session.token);
			await refetch();
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
