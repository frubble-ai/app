import { integrationConnection } from "@frubble/db";
import { and, eq } from "drizzle-orm";
import { DateTime } from "luxon";
import { z } from "zod";
import { defineUseCase } from "@/use-cases";
import { accountsByAlias, isAlreadyGone } from "@/use-cases/lib/composio";
import { betterAuthIdSchema } from "@/use-cases/lib/organizations/membership";

const sweepRetiringIntegrationsArgsSchema = z.object({
	organizationId: betterAuthIdSchema,
});

/**
 * How long a row whose account id never arrived keeps being looked up by alias. Composio documents
 * no expiry for an unfinished connection, so this is ours: long enough for an account it made to
 * show up in its listing.
 */
const ALIAS_LOOKUP_HOURS = 1;

/**
 * Remove the organization's retiring accounts at Composio, deleting each row only once Composio
 * confirms. One that fails stays and is tried again on the next sweep. A row without an account
 * id finds its account by alias (the row id), in case Composio made one and its answer was lost;
 * it stays until an account is found and removed, or ALIAS_LOOKUP_HOURS have passed.
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
				createdAt: integrationConnection.createdAt,
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
					: await accountsByAlias(ctx.composio, {
							organizationId,
							provider: row.provider,
							alias: row.id,
						});
				const lookingUntil = DateTime.fromJSDate(row.createdAt).plus({
					hours: ALIAS_LOOKUP_HOURS,
				});
				if (accountIds.length === 0 && DateTime.now() < lookingUntil) continue;
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
