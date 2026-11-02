import { z } from "zod";
import { defineUseCase } from "@/use-cases";
import {
	isUserRole,
	type TAuthenticatedUser,
} from "@/use-cases/lib/auth/auth-user";
import { badInput } from "@/use-cases/lib/shared/domain-errors";

const loadAuthenticatedUserFromRequestArgsSchema = z.object({
	headers: z.instanceof(Headers),
});

/**
 * The signed-in user for a request, through the session cache. An unknown role throws instead of
 * silently downgrading: it means a bug or a tampered session.
 */
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

		const rawRole = session.user.role;
		if (!isUserRole(rawRole)) {
			throw badInput(
				`Unknown role on session for user ${session.user.id}: ${String(rawRole ?? "null")}`,
			);
		}

		return {
			id: session.user.id,
			name: session.user.name,
			email: session.user.email,
			role: rawRole,
		};
	},
);
