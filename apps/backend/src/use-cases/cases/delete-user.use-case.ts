import { user } from "@frubble/db/schema";
import { userIdSchema } from "@frubble/gql";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { defineUseCase } from "@/use-cases";

const deleteUserArgsSchema = z.object({
	userId: userIdSchema,
});

/** Hard-delete a user row (cascades to the auth rows). Rolls back a sign-up that failed half-way. */
export const deleteUserUseCase = defineUseCase(async function deleteUserUseCase(
	ctx,
	args: { userId: string },
): Promise<void> {
	const { userId } = deleteUserArgsSchema.parse(args);

	await ctx.db.delete(user).where(eq(user.id, userId));
});
