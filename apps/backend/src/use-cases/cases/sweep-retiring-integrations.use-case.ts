import { integrationConnection } from "@frubble/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { defineUseCase } from "@/use-cases";
import { isAlreadyGone } from "@/use-cases/lib/composio";
import { betterAuthIdSchema } from "@/use-cases/lib/organizations/membership";

const sweepRetiringIntegrationsArgsSchema = z.object({
	organizationId: betterAuthIdSchema,
});

/**
 * Remove the organization's retiring accounts at Composio, deleting each row only once Composio
 * confirms. One that fails stays and is tried again on the next sweep. A row without an account
 * id finds its account by alias (the row id), in case Composio made one and its answer was lost.
 */
export const sweepRetiringIntegrationsUseCase = defineUseCase(
	async function sweepRetiringIntegrationsUseCase(
		ctx,
		args: { organizationId: string },
	): Promise<void> {
		const { organizationId } = sweepRetiringIntegrationsArgsSchema.parse(args);
		const rows = await ctx.db
			.select({
				id: integrationConnection.id,
				provider: integrationConnection.provider,
				accountId: integrationConnection.composioConnectedAccountId,
			})
			.from(integrationConnection)
			.where(
				and(
					eq(integrationConnection.organizationId, organizationId),
					eq(integrationConnection.status, "retiring"),
				),
			);
		for (const row of rows) {
			try {
				// No account id: Composio's answer never arrived, so any account it made for this
				// attempt carries the row id as its alias.
				const accountIds = row.accountId
					? [row.accountId]
					: (
							await ctx.composio.connectedAccounts.list({
								userIds: [organizationId],
								toolkitSlugs: [row.provider],
							})
						).items
							.filter((account) => account.alias === row.id)
							.map((account) => account.id);
				for (const accountId of accountIds) {
					await ctx.composio.connectedAccounts
						.delete(accountId)
						.catch((err: unknown) => {
							if (!isAlreadyGone(err)) throw err;
						});
				}
				await ctx.db
					.delete(integrationConnection)
					.where(eq(integrationConnection.id, row.id));
			} catch (err) {
				ctx.logger.warn(
					{ err, connectedAccountId: row.accountId },
					"Composio connected account not removed; retried on the next sweep",
				);
			}
		}
	},
);
