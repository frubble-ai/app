import { randomUUID } from "node:crypto";
import { integrationConnection, type TIntegrationProvider } from "@frubble/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { defineUseCase } from "@/use-cases";
import {
	integrationProviderSchema,
	removeConnectedAccounts,
} from "@/use-cases/lib/integrations/connections";
import {
	betterAuthIdSchema,
	MANAGER_ROLES,
	requireMembership,
} from "@/use-cases/lib/organizations/membership";

const startIntegrationConnectArgsSchema = z.object({
	userId: z.string().min(1),
	organizationId: betterAuthIdSchema,
	provider: integrationProviderSchema,
});

/**
 * Begin connecting a provider for an organization (owners and admins only): the provider's
 * consent page to send the browser to. It comes back to `/integrations/callback`, which
 * finishes. An unfinished earlier attempt for the same provider is dropped.
 */
export const startIntegrationConnectUseCase = defineUseCase(
	async function startIntegrationConnectUseCase(
		ctx,
		args: {
			userId: string;
			organizationId: string;
			provider: TIntegrationProvider;
		},
	): Promise<{ redirectUrl: string }> {
		const { userId, organizationId, provider } =
			startIntegrationConnectArgsSchema.parse(args);
		await requireMembership(ctx, {
			userId,
			organizationId,
			roles: MANAGER_ROLES,
		});

		const stale = await ctx.db
			.delete(integrationConnection)
			.where(
				and(
					eq(integrationConnection.organizationId, organizationId),
					eq(integrationConnection.provider, provider),
					eq(integrationConnection.status, "pending"),
				),
			)
			.returning({
				connectedAccountId: integrationConnection.composioConnectedAccountId,
			});
		await removeConnectedAccounts(
			ctx,
			stale.map((row) => row.connectedAccountId),
		);

		const id = randomUUID();
		const { connectedAccountId, redirectUrl } = await ctx.integrations.link({
			organizationId,
			provider,
			callbackUrl: `${ctx.config.publicUrl}/integrations/callback?connection=${id}`,
		});
		await ctx.db.insert(integrationConnection).values({
			id,
			organizationId,
			provider,
			composioConnectedAccountId: connectedAccountId,
			connectedById: userId,
		});
		return { redirectUrl };
	},
);
