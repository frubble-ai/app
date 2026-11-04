import { z } from "zod";
import { defineUseCase } from "@/use-cases";
import {
	listSlackChannels,
	openSession,
	type TSlackChannel,
} from "@/use-cases/lib/composio";
import { requireActiveConnection } from "@/use-cases/lib/integrations/connections";
import {
	betterAuthIdSchema,
	requireMembership,
} from "@/use-cases/lib/organizations/membership";

const listSlackChannelsArgsSchema = z.object({
	userId: z.string().min(1),
	organizationId: betterAuthIdSchema,
});

/** The workspace's channels the connected user can see, through the organization's connection. Any member may read them. */
export const listSlackChannelsUseCase = defineUseCase(
	async function listSlackChannelsUseCase(
		ctx,
		args: { userId: string; organizationId: string },
	): Promise<TSlackChannel[]> {
		const { userId, organizationId } = listSlackChannelsArgsSchema.parse(args);
		await requireMembership(ctx.db, { userId, organizationId });
		const connection = await requireActiveConnection(ctx.db, {
			organizationId,
			provider: "slack",
		});
		const session = await openSession(ctx.composio, {
			organizationId,
			toolkit: "slack",
			authConfigId: ctx.config.composio.authConfigIds.slack,
			connectedAccountId: connection.composioConnectedAccountId,
		});
		return listSlackChannels(ctx.composio, session);
	},
);
