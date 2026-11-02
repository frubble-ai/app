import { useCallback } from "react";
import {
	useChangePasswordMutation,
	useRequestPasswordResetMutation,
	useRequestSignUpCodeMutation,
	useResetPasswordMutation,
} from "../../gql/generated";
import { setToken } from "./token";

/**
 * The email-code and password requests. None starts a session; changing the password replaces the
 * current one, since the API revokes every session, the caller's too.
 */
export function useCodeActions() {
	const [requestSignUpCodeMutation] = useRequestSignUpCodeMutation();
	const [requestPasswordResetMutation] = useRequestPasswordResetMutation();
	const [resetPasswordMutation] = useResetPasswordMutation();
	const [changePasswordMutation] = useChangePasswordMutation();

	const requestSignUpCode = useCallback(
		async (input: { email: string }) => {
			const { data } = await requestSignUpCodeMutation({
				variables: { input },
			});
			return data?.requestSignUpCode ?? null;
		},
		[requestSignUpCodeMutation],
	);

	const requestPasswordReset = useCallback(
		async (input: { email: string }) => {
			const { data } = await requestPasswordResetMutation({
				variables: { input },
			});
			return data?.requestPasswordReset ?? null;
		},
		[requestPasswordResetMutation],
	);

	// Resets the password without signing in: the reset revokes every
	// session, so the caller routes the user back to sign-in.
	const resetPassword = useCallback(
		async (input: { email: string; code: string; newPassword: string }) => {
			const { data } = await resetPasswordMutation({ variables: { input } });
			return data?.resetPassword ?? null;
		},
		[resetPasswordMutation],
	);

	// The API revoked this session with the others: the token it returns replaces it
	const changePassword = useCallback(
		async (input: { currentPassword: string; newPassword: string }) => {
			const { data } = await changePasswordMutation({ variables: { input } });
			const changed = data?.changePassword ?? null;
			if (changed) await setToken(changed.token);
			return changed;
		},
		[changePasswordMutation],
	);

	return {
		requestSignUpCode,
		requestPasswordReset,
		resetPassword,
		changePassword,
	};
}
