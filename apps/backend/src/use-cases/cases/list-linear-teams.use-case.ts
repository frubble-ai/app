import { z } from "zod";
import type { TLinearTeam } from "@/integrations";
import { defineUseCase } from "@/use-cases";
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
		return ctx.integrations.brokers[connection.broker].run(
			"linear.listTeams",
			{ organizationId, accountRef: connection.accountRef },
			{},
		);
	},
);
