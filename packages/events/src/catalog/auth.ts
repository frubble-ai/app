import { z } from "zod";

// Signing up and resetting a password: the codes that prove an address.

/** 6-digit sign-up code. */
export const signupCodeRequestedSchema = z.object({
	type: z.literal("signup.code_requested"),
	email: z.email(),
	code: z.string(),
});

/** 6-digit password-reset code; only sent when an account matches. */
export const passwordResetRequestedSchema = z.object({
	type: z.literal("password.reset_requested"),
	email: z.email(),
	code: z.string(),
});
