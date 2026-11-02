import { z } from "zod";
import { defineUseCase } from "@/use-cases";
import { issueOneTimeCode } from "@/use-cases/lib/auth/one-time-code";
import { findUserIdByEmail } from "@/use-cases/lib/auth/user-lookup";
import { badInput } from "@/use-cases/lib/shared/domain-errors";

const requestAdminSignUpCodeArgsSchema = z.object({
	email: z
		.string()
		.trim()
		.toLowerCase()
		.email("Please enter a valid email address"),
});

/** Email a system-admin invite code. Its identifier prefix is what grants the role at sign-up. */
export const requestAdminSignUpCodeUseCase = defineUseCase(
	async function requestAdminSignUpCodeUseCase(
		ctx,
		args: { email: string },
	): Promise<void> {
		const { email } = requestAdminSignUpCodeArgsSchema.parse(args);

		if (await findUserIdByEmail(ctx.db, email)) {
			throw badInput("An account with this email already exists.");
		}

		const code = await issueOneTimeCode(ctx.db, ctx.config.adminSignup, email);

		await ctx.messages.send({
			type: "signup.code_requested",
			email,
			code,
			isAdminInvite: true,
		});
	},
);
