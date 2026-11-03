import { integrationConnection, type TIntegrationProvider } from "@frubble/db";
import { and, eq, inArray } from "drizzle-orm";
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
import { internalError } from "@/use-cases/lib/shared/domain-errors";

const disconnectIntegrationArgsSchema = z.object({
	userId: z.string().min(1),
	organizationId: betterAuthIdSchema,
	provider: integrationProviderSchema,
});

/**
 * Disconnect a provider (owners and admins only). Every row for it retires, an unfinished attempt
 * too, so no earlier consent can bring the connection back. Done only once Composio confirms each
 * account removed; otherwise this fails, the provider stays off for the organization, and the
 * removal is retried on every later look at its tools.
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
		const ids = rows.map((row) => row.id);
		await retireConnections(ctx, organizationId, ids);

		const unconfirmed = await ctx.db
			.select({ id: integrationConnection.id })
			.from(integrationConnection)
			.where(inArray(integrationConnection.id, ids));
		if (unconfirmed.length > 0) {
			throw internalError(
				`${provider} did not confirm the disconnect yet; it is retried automatically.`,
			);
		}
	},
);
