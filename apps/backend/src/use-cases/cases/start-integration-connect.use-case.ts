import { randomUUID } from "node:crypto";
import { integrationConnection, type TIntegrationProvider } from "@frubble/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { defineUseCase } from "@/use-cases";
import { retireIntegrationConnectionsUseCase } from "@/use-cases/cases/retire-integration-connections.use-case";
import { sweepRetiringIntegrationsUseCase } from "@/use-cases/cases/sweep-retiring-integrations.use-case";
import { openSession } from "@/use-cases/lib/composio";
import { integrationProviderSchema } from "@/use-cases/lib/integrations/connections";
import {
	betterAuthIdSchema,
	MANAGER_ROLES,
	requireMembership,
} from "@/use-cases/lib/organizations/membership";
import { badInput } from "@/use-cases/lib/shared/domain-errors";

const startIntegrationConnectArgsSchema = z.object({
	userId: z.string().min(1),
	organizationId: betterAuthIdSchema,
	provider: integrationProviderSchema,
});

/**
 * Begin connecting a provider for an organization (owners and admins only): the provider's
 * consent page to send the browser to. It comes back to `/integrations/callback`, which
 * finishes. An unfinished earlier attempt for the same provider is dropped; a disconnect while
 * Composio creates the account fails this connect.
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
		await requireMembership(ctx.db, {
			userId,
			organizationId,
			roles: MANAGER_ROLES,
		});

		const stale = await ctx.db
			.select({ id: integrationConnection.id })
			.from(integrationConnection)
			.where(
				and(
					eq(integrationConnection.organizationId, organizationId),
					eq(integrationConnection.provider, provider),
					eq(integrationConnection.status, "pending"),
				),
			);
		await retireIntegrationConnectionsUseCase({
			organizationId,
			connectionIds: stale.map((row) => row.id),
		});

		// The row comes first, so a disconnect while Composio is creating the account retires it.
		const id = randomUUID();
		await ctx.db.insert(integrationConnection).values({
			id,
			organizationId,
			provider,
			connectedById: userId,
		});

		const session = await openSession(ctx.composio, {
			organizationId,
			toolkit: provider,
			authConfigId: ctx.config.composio.authConfigIds[provider],
		});
		const request = await session
			.authorize(provider, {
				callbackUrl: `${ctx.config.publicUrl}/integrations/callback?connection=${id}`,
			})
			.catch(async (err: unknown) => {
				await ctx.db
					.delete(integrationConnection)
					.where(eq(integrationConnection.id, id));
				throw err;
			});
		const connectedAccountId = request.id;
		const redirectUrl = request.redirectUrl;

		// Recorded whatever the row's status, so a retired row still leads the sweep to the account.
		const [row] = await ctx.db
			.update(integrationConnection)
			.set({ composioConnectedAccountId: connectedAccountId })
			.where(eq(integrationConnection.id, id))
			.returning({ status: integrationConnection.status });
		if (row?.status !== "pending") {
			// Gone already: a retiring row records the account, so a failed removal is retried.
			if (!row) {
				await ctx.db.insert(integrationConnection).values({
					id,
					organizationId,
					provider,
					status: "retiring",
					composioConnectedAccountId: connectedAccountId,
					connectedById: userId,
				});
			}
			await sweepRetiringIntegrationsUseCase({ organizationId });
			throw badInput(
				`${provider} was disconnected while connecting; start again.`,
			);
		}
		if (!redirectUrl) {
			// Nothing to send the user to: the attempt retires with its account.
			await retireIntegrationConnectionsUseCase({
				organizationId,
				connectionIds: [id],
			});
			throw new Error(`Composio returned no redirect URL for ${provider}`);
		}
		return { redirectUrl };
	},
);
