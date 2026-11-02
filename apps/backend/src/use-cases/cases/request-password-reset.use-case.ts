import { z } from "zod";
import { defineUseCase } from "@/use-cases";
import { issueOneTimeCode } from "@/use-cases/lib/auth/one-time-code";
import {
	authRateLimitChecks,
	enforceRateLimits,
} from "@/use-cases/lib/auth/rate-limit";
import { findUserIdByEmail } from "@/use-cases/lib/auth/user-lookup";

const requestPasswordResetArgsSchema = z.object({
	email: z
		.string()
		.trim()
		.toLowerCase()
		.email("Please enter a valid email address"),
	clientIp: z.string().optional(),
});

/** Email a reset code if an account matches; silent otherwise, so addresses cannot be enumerated. */
export const requestPasswordResetUseCase = defineUseCase(
	async function requestPasswordResetUseCase(
		ctx,
		args: { email: string; clientIp?: string },
	): Promise<void> {
		const { email, clientIp } = requestPasswordResetArgsSchema.parse(args);

		await enforceRateLimits(
			ctx.db,
			authRateLimitChecks(ctx.config.authRateLimits, "password-reset-code", {
				email,
				clientIp,
			}),
		);

		if (!(await findUserIdByEmail(ctx.db, email))) return;

		const code = await issueOneTimeCode(
			ctx.db,
			ctx.config.passwordReset,
			email,
		);

		await ctx.messages.send({
			type: "password.reset_requested",
			email,
			code,
		});
	},
);
