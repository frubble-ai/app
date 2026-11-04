import { integrationConnection } from "@frubble/db";
import { and, eq } from "drizzle-orm";
import { DateTime } from "luxon";
import { z } from "zod";
import { defineUseCase } from "@/use-cases";
import { betterAuthIdSchema } from "@/use-cases/lib/organizations/membership";

const sweepRetiringIntegrationsArgsSchema = z.object({
	organizationId: betterAuthIdSchema,
});

/**
 * How long a row whose account never arrived keeps being looked up by its attempt. No broker
 * documents an expiry for an unfinished connection, so this is ours: long enough for an account it
 * made to show up in its listing.
 */
const ATTEMPT_LOOKUP_HOURS = 1;

/**
 * Remove the organization's retiring accounts at their brokers, deleting each row only once its
 * broker confirms. One that fails stays and is tried again on the next sweep. A row without an
 * account finds it by its attempt (the row id), in case the broker made one and its answer was
 * lost; it stays until an account is found and removed, or ATTEMPT_LOOKUP_HOURS have passed.
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
				broker: integrationConnection.broker,
				accountRef: integrationConnection.externalAccountRef,
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
			const broker = ctx.integrations.brokers[row.broker];
			try {
				// No account: the broker's answer never arrived, so look for what it made for this
				// attempt, the row id.
				const accountRefs = row.accountRef
					? [row.accountRef]
					: await broker.findAccountsByAttempt({
							organizationId,
							provider: row.provider,
							attemptId: row.id,
						});
				const lookingUntil = DateTime.fromJSDate(row.createdAt).plus({
					hours: ATTEMPT_LOOKUP_HOURS,
				});
				if (accountRefs.length === 0 && DateTime.now() < lookingUntil) continue;
				for (const accountRef of accountRefs) {
					await broker.removeAccount(accountRef);
				}
				await ctx.db
					.delete(integrationConnection)
					.where(eq(integrationConnection.id, row.id));
			} catch (err) {
				ctx.logger.warn(
					{ err, broker: row.broker, accountRef: row.accountRef },
					"Broker account not removed; retried on the next sweep",
				);
			}
		}
	},
);
