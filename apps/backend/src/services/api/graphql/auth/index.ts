import {
	ChangePasswordInputSchema,
	RequestPasswordResetInputSchema,
	RequestSignUpCodeInputSchema,
	ResetPasswordInputSchema,
	SignInInputSchema,
	SignUpInputSchema,
} from "@frubble/gql/validation";
import type { Resolvers } from "@/__generated__/resolvers-types";
import { parseSchema } from "@/services/api/graphql/lib/errors";
import { mapUserToMe, requireAuth } from "@/services/api/graphql/shared";
import { changePasswordUseCase } from "@/use-cases/cases/change-password.use-case";
import { requestPasswordResetUseCase } from "@/use-cases/cases/request-password-reset.use-case";
import { requestSignUpCodeUseCase } from "@/use-cases/cases/request-sign-up-code.use-case";
import { resetPasswordUseCase } from "@/use-cases/cases/reset-password.use-case";
import { signInWithEmailPasswordUseCase } from "@/use-cases/cases/sign-in-with-email-password.use-case";
import { signOutUseCase } from "@/use-cases/cases/sign-out.use-case";
import { signUpWithEmailUseCase } from "@/use-cases/cases/sign-up-with-email.use-case";
import type { TAuthSignInResult } from "@/use-cases/lib/auth/auth-user";

/** Every sign-in method answers the same way: the session token and the user. */
function toAuthPayload(result: TAuthSignInResult) {
	return { user: mapUserToMe(result.user), token: result.sessionToken };
}

export function createAuthResolvers(): Resolvers {
	return {
		Query: {
			health: () => true,
			me: (_parent, _args, context) =>
				context.user ? mapUserToMe(context.user) : null,
		},
		Mutation: {
			requestSignUpCode: async (_parent, args, context) => {
				const parsed = parseSchema(RequestSignUpCodeInputSchema(), args.input);
				await requestSignUpCodeUseCase({
					email: parsed.email,
					clientIp: context.clientIp,
				});
				return { sent: true };
			},

			signUp: async (_parent, args, context) => {
				const parsed = parseSchema(SignUpInputSchema(), args.input);
				return toAuthPayload(
					await signUpWithEmailUseCase({
						...parsed,
						clientIp: context.clientIp,
					}),
				);
			},

			signIn: async (_parent, args, context) => {
				const parsed = parseSchema(SignInInputSchema(), args.input);
				return toAuthPayload(
					await signInWithEmailPasswordUseCase({
						...parsed,
						clientIp: context.clientIp,
					}),
				);
			},

			signOut: requireAuth(async (_parent, _args, context) => {
				await signOutUseCase({
					headers: context.requestHeaders,
					userId: context.user.id,
				});
				return { signedOut: true };
			}),

			// Always `sent: true`: the use case only emails an existing account.
			requestPasswordReset: async (_parent, args, context) => {
				const parsed = parseSchema(
					RequestPasswordResetInputSchema(),
					args.input,
				);
				await requestPasswordResetUseCase({
					email: parsed.email,
					clientIp: context.clientIp,
				});
				return { sent: true };
			},

			resetPassword: async (_parent, args, context) => {
				const parsed = parseSchema(ResetPasswordInputSchema(), args.input);
				await resetPasswordUseCase({ ...parsed, clientIp: context.clientIp });
				return { reset: true };
			},

			changePassword: requireAuth(async (_parent, args, context) => {
				const parsed = parseSchema(ChangePasswordInputSchema(), args.input);
				const { token } = await changePasswordUseCase({
					userId: context.user.id,
					headers: context.requestHeaders,
					currentPassword: parsed.currentPassword,
					newPassword: parsed.newPassword,
				});
				return { changed: true, token };
			}),
		},
	};
}
