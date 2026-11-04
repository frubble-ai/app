import { z } from "zod";
import { defineUseCase } from "@/use-cases";
import {
	listLinearTeams,
	openSession,
	type TLinearTeam,
} from "@/use-cases/lib/composio";
import { requireActiveConnection } from "@/use-cases/lib/integrations/connections";
import {
	betterAuthIdSchema,
	requireMembership,
} from "@/use-cases/lib/organizations/membership";

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
		await requireMembership(ctx.db, { userId, organizationId });
		const connection = await requireActiveConnection(ctx.db, {
			organizationId,
			provider: "linear",
		});
		const session = await openSession(ctx.composio, {
			organizationId,
			toolkit: "linear",
			authConfigId: ctx.config.composio.authConfigIds.linear,
			connectedAccountId: connection.composioConnectedAccountId,
		});
		return listLinearTeams(ctx.composio, session);
	},
);
