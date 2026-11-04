import { integrationConnection, organization } from "@frubble/db";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import type { TAccountState } from "@/integrations";
import { defineUseCase } from "@/use-cases";
import { sweepRetiringIntegrationsUseCase } from "@/use-cases/cases/sweep-retiring-integrations.use-case";

/** How long the lookup may hold the organization's lock; past it the row waits for the next look. */
const BROKER_LOOKUP_TIMEOUT_MS = 5_000;

const settleIntegrationConnectionArgsSchema = z.object({
	connectionId: z.uuid(),
});

/**
 * Bring a connection in line with its broker. Live: it becomes the organization's connection to
 * the provider and every other row for that provider retires. Failed: it retires. Still pending,
 * or the broker unreachable: it waits for the next look. Gone or retired: failed.
 */
export const settleIntegrationConnectionUseCase = defineUseCase(
	async function settleIntegrationConnectionUseCase(
		ctx,
		args: { connectionId: string },
	): Promise<TAccountState> {
		const { connectionId } = settleIntegrationConnectionArgsSchema.parse(args);
		const [row] = await ctx.db
			.select()
			.from(integrationConnection)
			.where(eq(integrationConnection.id, connectionId))
			.limit(1);
		if (!row || row.status === "retiring") return "failed";
		if (row.status === "active") return "active";
		// The broker is still creating the account.
		const accountRef = row.externalAccountRef;
		if (!accountRef) return "pending";

		// The broker is asked under the organization's lock, so answers are read one at a time and each
		// acts on the row as the previous one left it: a later "failed" never retires a connection
		// an earlier "live" activated, whichever settle asked first.
		const settled = await ctx.db.transaction(async (tx) => {
			// One settle per organization at a time, so two never lock its rows in opposite order.
			await tx
				.select({ id: organization.id })
				.from(organization)
				.where(eq(organization.id, row.organizationId))
				.for("update");
			const [current] = await tx
				.select({ status: integrationConnection.status })
				.from(integrationConnection)
				.where(eq(integrationConnection.id, row.id))
				.for("update");
			// Another settle got here first: active is its success, retiring or gone is a failure.
			if (current?.status === "active") return "active" as const;
			if (current?.status !== "pending") return "failed" as const;

			let state: TAccountState;
			try {
				// The broker stops at the signal, so the lock is never held longer.
				state = await ctx.integrations.brokers[row.broker].accountState(
					accountRef,
					{ signal: AbortSignal.timeout(BROKER_LOOKUP_TIMEOUT_MS) },
				);
			} catch (err) {
				ctx.logger.warn(
					{ err, connectionId, broker: row.broker },
					"Broker state unknown; the connection stays pending",
				);
				return "pending" as const;
			}
			if (state === "pending") return "pending" as const;
			if (state === "failed") {
				await tx
					.update(integrationConnection)
					.set({ status: "retiring" })
					.where(eq(integrationConnection.id, row.id));
				return "failed" as const;
			}
			await tx
				.update(integrationConnection)
				.set({ status: "retiring" })
				.where(
					and(
						eq(integrationConnection.organizationId, row.organizationId),
						eq(integrationConnection.provider, row.provider),
						ne(integrationConnection.id, row.id),
					),
				);
			await tx
				.update(integrationConnection)
				.set({ status: "active" })
				.where(eq(integrationConnection.id, row.id));
			return "active" as const;
		});
		if (settled === "pending") return "pending";
		await sweepRetiringIntegrationsUseCase({
			organizationId: row.organizationId,
		});
		return settled;
	},
);
