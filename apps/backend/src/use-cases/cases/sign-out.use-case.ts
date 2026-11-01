import { userIdSchema } from "@frubble/gql";
import { z } from "zod";
import { defineUseCase } from "@/use-cases";

const signOutArgsSchema = z.object({
	headers: z.instanceof(Headers),
	userId: userIdSchema,
});

/** End the session in `headers`. A failure propagates: a session that is still live must not be reported as ended. */
export const signOutUseCase = defineUseCase(async function signOutUseCase(
	ctx,
	args: { headers: Headers; userId: string },
): Promise<void> {
	const { headers } = signOutArgsSchema.parse(args);
	await ctx.auth.api.signOut({ headers });
});
