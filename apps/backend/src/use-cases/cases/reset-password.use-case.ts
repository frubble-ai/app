import { account } from "@frubble/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { defineUseCase } from "@/use-cases";
import { redeemOneTimeCode } from "@/use-cases/lib/auth/one-time-code";
import {
	authRateLimitChecks,
	enforceRateLimits,
} from "@/use-cases/lib/auth/rate-limit";
import { findUserIdByEmail } from "@/use-cases/lib/auth/user-lookup";
import { badInput } from "@/use-cases/lib/shared/domain-errors";

export const INVALID_RESET_CODE_MESSAGE =
	"Reset code is invalid or has expired";

// Better Auth's default `emailAndPassword` bounds, so a reset cannot set a password sign-in rejects.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

const resetPasswordArgsSchema = z.object({
	email: z.string().trim().toLowerCase().email(),
	code: z.string().trim(),
	newPassword: z
		.string()
		.min(
			PASSWORD_MIN_LENGTH,
			`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
		)
		.max(PASSWORD_MAX_LENGTH, "Password is too long."),
	clientIp: z.string().optional(),
});

/** Set a new password from a reset code and revoke every session: the old credential may be compromised. */
export const resetPasswordUseCase = defineUseCase(
	async function resetPasswordUseCase(
		ctx,
		args: {
			email: string;
			code: string;
			newPassword: string;
			clientIp?: string;
		},
	): Promise<void> {
		const { email, code, newPassword, clientIp } =
			resetPasswordArgsSchema.parse(args);

		await enforceRateLimits(
			ctx.db,
			authRateLimitChecks(ctx.config.authRateLimits, "password-reset", {
				email,
				clientIp,
			}),
		);

		// The code is claimed before the password changes, so two requests with the same code cannot
		// both succeed; if the change fails the code is put back for a retry.
		const result = await redeemOneTimeCode(
			ctx.db,
			ctx.config.passwordReset,
			email,
			code,
			async () => {
				const userId = await findUserIdByEmail(ctx.db, email);
				if (!userId) {
					throw badInput(INVALID_RESET_CODE_MESSAGE);
				}

				const authContext = await ctx.auth.$context;
				const passwordHash = await authContext.password.hash(newPassword);

				const [credential] = await ctx.db
					.select({ id: account.id })
					.from(account)
					.where(
						and(
							eq(account.userId, userId),
							eq(account.providerId, "credential"),
						),
					)
					.limit(1);
				if (credential) {
					await authContext.internalAdapter.updatePassword(
						userId,
						passwordHash,
					);
				} else {
					await authContext.internalAdapter.linkAccount({
						userId,
						providerId: "credential",
						accountId: userId,
						password: passwordHash,
					});
				}

				await authContext.internalAdapter.deleteUserSessions(userId);
			},
		);
		if (result !== "redeemed") {
			throw badInput(INVALID_RESET_CODE_MESSAGE);
		}
	},
);
