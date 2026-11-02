import { z } from "zod";
import { defineUseCase } from "@/use-cases";
import type { TAuthenticatedUser } from "@/use-cases/lib/auth/auth-user";

const loadAuthenticatedUserFromRequestArgsSchema = z.object({
	headers: z.instanceof(Headers),
});

/** The signed-in user for a request, through the session cache. */
export const loadAuthenticatedUserFromRequestUseCase = defineUseCase(
	async function loadAuthenticatedUserFromRequestUseCase(
		ctx,
		args: { headers: Headers },
	): Promise<TAuthenticatedUser | null> {
		const { headers } = loadAuthenticatedUserFromRequestArgsSchema.parse(args);

		const session = (await ctx.sessionCache.get(headers)) as Awaited<
			ReturnType<typeof ctx.auth.api.getSession>
		>;
		if (!session?.user) return null;

		return {
			id: session.user.id,
			name: session.user.name,
			email: session.user.email,
		};
	},
);
