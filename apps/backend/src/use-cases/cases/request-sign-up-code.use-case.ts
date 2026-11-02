import { z } from "zod";
import { defineUseCase } from "@/use-cases";
import { SIGN_UP_UNAVAILABLE_MESSAGE } from "@/use-cases/cases/sign-up-with-email.use-case";
import { issueOneTimeCode } from "@/use-cases/lib/auth/one-time-code";
import {
	authRateLimitChecks,
	enforceRateLimits,
} from "@/use-cases/lib/auth/rate-limit";
import { findUserIdByEmail } from "@/use-cases/lib/auth/user-lookup";
import { forbidden } from "@/use-cases/lib/shared/domain-errors";

const requestSignUpCodeArgsSchema = z.object({
	email: z
		.string()
		.trim()
		.toLowerCase()
		.email("Please enter a valid email address"),
	clientIp: z.string().optional(),
});

/** Email a 6-digit sign-up code to an address with no account yet; `signUp` redeems it. */
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
			// FORBIDDEN lets the app offer sign-in; the message stays generic.
			throw forbidden(SIGN_UP_UNAVAILABLE_MESSAGE);
		}

		const code = await issueOneTimeCode(ctx.db, ctx.config.authSignup, email);

		await ctx.messages.send({
			type: "signup.code_requested",
			email,
			code,
			isAdminInvite: false,
		});
	},
);
