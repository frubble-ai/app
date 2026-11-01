import { userIdSchema } from "@frubble/gql";
import { z } from "zod";
import { BetterAuthErrorCode } from "@/better-auth/lib/better-auth-errors";
import { defineUseCase } from "@/use-cases";
import {
	PASSWORD_MAX_LENGTH,
	PASSWORD_MIN_LENGTH,
} from "@/use-cases/cases/reset-password.use-case";
import { rethrowAsDomainError } from "@/use-cases/lib/auth/better-auth-error";
import { enforceSignInAgainLimit } from "@/use-cases/lib/auth/rate-limit";
import { badInput } from "@/use-cases/lib/shared/domain-errors";

const changePasswordArgsSchema = z.object({
	userId: userIdSchema,
	headers: z.instanceof(Headers),
	currentPassword: z.string().min(1),
	newPassword: z
		.string()
		.min(
			PASSWORD_MIN_LENGTH,
			`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
		)
		.max(PASSWORD_MAX_LENGTH, "Password is too long."),
});

/**
 * Change the calling user's password. Better Auth checks the current one against the session in
 * `headers` and revokes every other session, so a stolen session elsewhere is cut off.
 */
export const changePasswordUseCase = defineUseCase(
	async function changePasswordUseCase(
		ctx,
		args: {
			userId: string;
			headers: Headers;
			currentPassword: string;
			newPassword: string;
		},
	): Promise<void> {
		const { userId, headers, currentPassword, newPassword } =
			changePasswordArgsSchema.parse(args);
		// Proving the current password counts as a sign-in attempt.
		await enforceSignInAgainLimit(ctx, userId);

		await ctx.auth.api
			.changePassword({
				body: { currentPassword, newPassword, revokeOtherSessions: true },
				headers,
			})
			.catch((err: unknown) =>
				rethrowAsDomainError(err, {
					[BetterAuthErrorCode.INVALID_PASSWORD]: badInput(
						"Current password is incorrect.",
					),
					[BetterAuthErrorCode.CREDENTIAL_ACCOUNT_NOT_FOUND]: badInput(
						"This account has no password yet. Use forgot password to set one.",
					),
					[BetterAuthErrorCode.PASSWORD_TOO_SHORT]: badInput(
						`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
					),
					[BetterAuthErrorCode.PASSWORD_TOO_LONG]: badInput(
						"Password is too long.",
					),
				}),
			);
	},
);
