import { integrationConnection, type TIntegrationProvider } from "@frubble/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { defineUseCase } from "@/use-cases";
import {
	integrationProviderSchema,
	requireActiveConnection,
} from "@/use-cases/lib/integrations/connections";
import {
	betterAuthIdSchema,
	MANAGER_ROLES,
	requireMembership,
} from "@/use-cases/lib/organizations/membership";

const disconnectIntegrationArgsSchema = z.object({
	userId: z.string().min(1),
	organizationId: betterAuthIdSchema,
	provider: integrationProviderSchema,
});

/** Disconnect a provider (owners and admins only): Composio revokes the tokens first. */
export const disconnectIntegrationUseCase = defineUseCase(
	async function disconnectIntegrationUseCase(
		ctx,
		args: {
			userId: string;
			organizationId: string;
			provider: TIntegrationProvider;
		},
	): Promise<void> {
		const { userId, organizationId, provider } =
			disconnectIntegrationArgsSchema.parse(args);
		await requireMembership(ctx, {
			userId,
			organizationId,
			roles: MANAGER_ROLES,
		});
		const connection = await requireActiveConnection(ctx, {
			organizationId,
			provider,
		});
		await ctx.integrations.remove(connection.composioConnectedAccountId);
		await ctx.db
			.delete(integrationConnection)
			.where(eq(integrationConnection.id, connection.id));
	},
);
