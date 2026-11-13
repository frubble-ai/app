import { z } from "zod";
import { defineUseCase } from "@/use-cases";
import { issueOneTimeCode } from "@/use-cases/lib/auth/one-time-code";
import {
	authRateLimitChecks,
	enforceRateLimits,
} from "@/use-cases/lib/auth/rate-limit";
import { findUserIdByEmail } from "@/use-cases/lib/auth/user-lookup";

const requestSignUpCodeArgsSchema = z.object({
	email: z
		.string()
		.trim()
		.toLowerCase()
		.email("Please enter a valid email address"),
	clientIp: z.string().optional(),
});

/**
 * Email a 6-digit sign-up code to an address with no account yet; `signUp` redeems it. An address
 * that has one gets an email saying so instead, and the caller gets the same answer either way, so
 * the request cannot be used to find out which addresses are registered.
 */
export const requestSignUpCodeUseCase = defineUseCase(
	async function requestSignUpCodeUseCase(
		ctx,
		args: { email: string; clientIp?: string },
	): Promise<void> {
		const { email, clientIp } = requestSignUpCodeArgsSchema.parse(args);

		await enforceRateLimits(
			ctx.db,
			authRateLimitChecks(ctx.config.authRateLimits, "sign-up-code", {
				email,
				clientIp,
			}),
		);

		if (await findUserIdByEmail(ctx.db, email)) {
			await ctx.messages.send({ type: "signup.account_exists", email });
			return;
		}

		const code = await issueOneTimeCode(ctx.db, ctx.config.authSignup, email);

		await ctx.messages.send({
			type: "signup.code_requested",
			email,
			code,
		});
	},
);
