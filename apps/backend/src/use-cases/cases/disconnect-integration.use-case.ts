import { integrationConnection, type TIntegrationProvider } from "@frubble/db";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { defineUseCase } from "@/use-cases";
import { retireIntegrationConnectionsUseCase } from "@/use-cases/cases/retire-integration-connections.use-case";
import {
	integrationProviderSchema,
	requireActiveConnection,
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
 * too, so no earlier consent can bring the connection back. Done only once the broker confirms
 * each account removed; otherwise this fails, the provider stays off for the organization, and the
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
		await requireMembership(ctx.db, {
			userId,
			organizationId,
			roles: MANAGER_ROLES,
		});
		await requireActiveConnection(ctx.db, { organizationId, provider });
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
		await retireIntegrationConnectionsUseCase({
			organizationId,
			connectionIds: ids,
		});

		// A row still without an account is an attempt the broker has not answered: its connect
		// records the account when the answer comes and removes it, so it is not ours to confirm.
		const unconfirmed = await ctx.db
			.select({ id: integrationConnection.id })
			.from(integrationConnection)
			.where(
				and(
					inArray(integrationConnection.id, ids),
					isNotNull(integrationConnection.externalAccountRef),
				),
			);
		if (unconfirmed.length > 0) {
			throw internalError(
				`${provider} did not confirm the disconnect yet; it is retried automatically.`,
			);
		}
	},
);
