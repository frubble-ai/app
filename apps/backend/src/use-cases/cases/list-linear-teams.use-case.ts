import { z } from "zod";
import type { TLinearTeam } from "@/integrations";
import { defineUseCase } from "@/use-cases";
import { runThroughConnection } from "@/use-cases/lib/integrations/connections";
import { betterAuthIdSchema } from "@/use-cases/lib/organizations/membership";

const listLinearTeamsArgsSchema = z.object({
	userId: z.string().min(1),
	organizationId: betterAuthIdSchema,
});

/** The Linear teams the connected user can see, through the organization's connection. Any member may read them. */
export const listLinearTeamsUseCase = defineUseCase(
	async function listLinearTeamsUseCase(
		ctx,
		args: { userId: string; organizationId: string },
	): Promise<TLinearTeam[]> {
		const { userId, organizationId } = listLinearTeamsArgsSchema.parse(args);
		return runThroughConnection(ctx.db, ctx.integrations, {
			userId,
			organizationId,
			action: "linear.listTeams",
			input: {},
		});
	},
);
