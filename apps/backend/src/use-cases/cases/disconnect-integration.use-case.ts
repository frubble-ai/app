import { integrationConnection, type TIntegrationProvider } from "@frubble/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { defineUseCase } from "@/use-cases";
import {
	integrationProviderSchema,
	requireActiveConnection,
	retireConnections,
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

/**
 * Disconnect a provider (owners and admins only). Every row for it retires, an unfinished attempt
 * too, so no earlier consent can bring the connection back; Composio removes each account, and
 * one it fails to remove is retried until it confirms.
 */
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
		await requireActiveConnection(ctx, { organizationId, provider });
		const rows = await ctx.db
			.select({ id: integrationConnection.id })
			.from(integrationConnection)
			.where(
				and(
					eq(integrationConnection.organizationId, organizationId),
					eq(integrationConnection.provider, provider),
				),
			);
		await retireConnections(
			ctx,
			organizationId,
			rows.map((row) => row.id),
		);
	},
);
