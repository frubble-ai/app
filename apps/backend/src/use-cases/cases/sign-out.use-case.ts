import { userIdSchema } from "@frubble/gql";
import { z } from "zod";
import { defineUseCase } from "@/use-cases";

const signOutArgsSchema = z.object({
	headers: z.instanceof(Headers),
	userId: userIdSchema,
});

/** End the session in `headers`. A failure is logged; the caller is signed out either way. */
export const signOutUseCase = defineUseCase(async function signOutUseCase(
	ctx,
	args: { headers: Headers; userId: string },
): Promise<void> {
	const { headers, userId } = signOutArgsSchema.parse(args);

	try {
		await ctx.auth.api.signOut({ headers });
	} catch (error) {
		ctx.logger.warn(
			{ err: error, userId },
			"auth.api.signOut failed; treating sign-out as successful",
		);
	}
});
