import { user } from "@frubble/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { BetterAuthErrorCode } from "@/better-auth/lib/better-auth-errors";
import { defineUseCase } from "@/use-cases";
import { deleteUserUseCase } from "@/use-cases/cases/delete-user.use-case";
import {
	formatAuthSignInResult,
	type TAuthSignInResult,
} from "@/use-cases/lib/auth/auth-user";
import { rethrowAsDomainError } from "@/use-cases/lib/auth/better-auth-error";
import { verifyCode } from "@/use-cases/lib/auth/fixed-one-time-code";
import {
	deleteOneTimeCode,
	verifyOneTimeCode,
} from "@/use-cases/lib/auth/one-time-code";
import {
	authRateLimitChecks,
	enforceRateLimits,
} from "@/use-cases/lib/auth/rate-limit";
import { badInput, forbidden } from "@/use-cases/lib/shared/domain-errors";

export const INVALID_SIGN_UP_CODE_MESSAGE =
	"Sign up code is invalid or has expired";
/** Deliberately generic: it does not say the address is registered. */
export const SIGN_UP_UNAVAILABLE_MESSAGE =
	"We couldn't sign you up with this email. Try signing in instead.";

const signUpWithEmailArgsSchema = z.object({
	email: z.string().trim().toLowerCase().email(),
	code: z.string().trim(),
	name: z.string().trim().min(1, "Please enter your name."),
	password: z.string(),
	clientIp: z.string().optional(),
});

/**
 * Finish an email sign-up with a code. The code's prefix (set server-side) decides the role. The
 * code is burned only after Better Auth creates the account, so a rejected password can retry.
 */
export const signUpWithEmailUseCase = defineUseCase(
	async function signUpWithEmailUseCase(
		ctx,
		args: {
			email: string;
			code: string;
			name: string;
			password: string;
			clientIp?: string;
		},
	): Promise<TAuthSignInResult> {
		const { email, code, name, password, clientIp } =
			signUpWithEmailArgsSchema.parse(args);

		await enforceRateLimits(
			ctx.db,
			authRateLimitChecks(ctx.config.authRateLimits, "sign-up", {
				email,
				clientIp,
			}),
		);

		// A customer code and an admin invite can be live for the same address; each keeps its
		// own attempt count. An admin invite takes the emailed code only: the fixed code is for
		// environments without email, and nothing there may become an admin by knowing an address.
		let flow = ctx.config.authSignup;
		let result = await verifyCode(ctx.db, ctx.config.email, flow, email, code);
		if (result !== "valid") {
			const invite = await verifyOneTimeCode(
				ctx.db,
				ctx.config.adminSignup,
				email,
				code,
			);
			if (invite === "valid") {
				flow = ctx.config.adminSignup;
				result = invite;
			}
		}
		if (result !== "valid") {
			throw badInput(INVALID_SIGN_UP_CODE_MESSAGE);
		}
		const isAdmin = flow === ctx.config.adminSignup;

		const rawResult = await ctx.auth.api
			.signUpEmail({ body: { name, email, password } })
			.catch((err: unknown) =>
				rethrowAsDomainError(err, {
					[BetterAuthErrorCode.PASSWORD_TOO_SHORT]: badInput(
						"Password must be at least 8 characters.",
					),
					[BetterAuthErrorCode.PASSWORD_TOO_LONG]: badInput(
						"Password is too long.",
					),
					[BetterAuthErrorCode.USER_ALREADY_EXISTS]: forbidden(
						SIGN_UP_UNAVAILABLE_MESSAGE,
					),
					[BetterAuthErrorCode.USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL]:
						forbidden(SIGN_UP_UNAVAILABLE_MESSAGE),
					[BetterAuthErrorCode.INVALID_EMAIL]: badInput(
						"Please enter a valid email address.",
					),
					[BetterAuthErrorCode.INVALID_PASSWORD]: badInput(
						"Please enter a password.",
					),
				}),
			);
		const formatted = formatAuthSignInResult(
			rawResult,
			"Sign up failed: no session token returned",
		);

		try {
			await ctx.db
				.update(user)
				// The role is assigned here, never from client input.
				.set(
					isAdmin
						? { emailVerified: true, role: "system_admin" }
						: { emailVerified: true },
				)
				.where(eq(user.id, formatted.user.id));
			await deleteOneTimeCode(ctx.db, flow, email);
		} catch (error) {
			await deleteUserUseCase({ userId: formatted.user.id }).catch(
				(rollbackError: unknown) =>
					ctx.logger.error(
						{ err: rollbackError, userId: formatted.user.id },
						"sign-up rollback failed",
					),
			);
			throw error;
		}

		return isAdmin
			? { ...formatted, user: { ...formatted.user, role: "system_admin" } }
			: formatted;
	},
);
