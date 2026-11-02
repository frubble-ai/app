import { z } from "zod";
import { BetterAuthErrorCode } from "@/better-auth/lib/better-auth-errors";
import { defineUseCase } from "@/use-cases";
import {
	formatAuthSignInResult,
	type TAuthSignInResult,
} from "@/use-cases/lib/auth/auth-user";
import { rethrowAsDomainError } from "@/use-cases/lib/auth/better-auth-error";
import {
	authRateLimitChecks,
	enforceRateLimits,
} from "@/use-cases/lib/auth/rate-limit";
import { badInput } from "@/use-cases/lib/shared/domain-errors";

const signInWithEmailPasswordArgsSchema = z.object({
	email: z
		.string()
		.trim()
		.toLowerCase()
		.email("Please enter a valid email address."),
	password: z.string().min(1, "Please enter a password."),
	clientIp: z.string().optional(),
});

export const signInWithEmailPasswordUseCase = defineUseCase(
	async function signInWithEmailPasswordUseCase(
		ctx,
		args: { email: string; password: string; clientIp?: string },
	): Promise<TAuthSignInResult> {
		const { email, password, clientIp } =
			signInWithEmailPasswordArgsSchema.parse(args);

		await enforceRateLimits(
			ctx.db,
			authRateLimitChecks(ctx.config.authRateLimits, "sign-in", {
				email,
				clientIp,
			}),
		);

		const result = await ctx.auth.api
			.signInEmail({ body: { email, password } })
			.catch((err: unknown) =>
				rethrowAsDomainError(err, {
					[BetterAuthErrorCode.INVALID_EMAIL_OR_PASSWORD]: badInput(
						"Wrong email or password.",
					),
					[BetterAuthErrorCode.EMAIL_NOT_VERIFIED]: badInput(
						"Please verify your email first.",
					),
				}),
			);
		return formatAuthSignInResult(
			result,
			"Sign in failed: no session token returned",
		);
	},
);
