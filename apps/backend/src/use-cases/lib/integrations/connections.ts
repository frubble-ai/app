import {
	INTEGRATION_PROVIDERS,
	integrationConnection,
	organization,
	type TIntegrationProvider,
} from "@frubble/db";
import { and, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";
import type { TConnectedAccountState } from "@/composio";
import type { TUseCaseContext } from "@/use-cases";
import { notFound } from "@/use-cases/lib/shared/domain-errors";

export const integrationProviderSchema = z.enum(INTEGRATION_PROVIDERS);

type TConnectionRow = typeof integrationConnection.$inferSelect;

/** The organization's live connection to a provider, or not found. */
export async function requireActiveConnection(
	ctx: TUseCaseContext,
	args: { organizationId: string; provider: TIntegrationProvider },
): Promise<TConnectionRow & { composioConnectedAccountId: string }> {
	const [row] = await ctx.db
		.select()
		.from(integrationConnection)
		.where(
			and(
				eq(integrationConnection.organizationId, args.organizationId),
				eq(integrationConnection.provider, args.provider),
				eq(integrationConnection.status, "active"),
			),
		)
		.limit(1);
	if (!row?.composioConnectedAccountId) {
		throw notFound(`${args.provider} is not connected.`);
	}
	return { ...row, composioConnectedAccountId: row.composioConnectedAccountId };
}

/**
 * Remove the organization's retiring accounts at Composio, deleting each row only once Composio
 * confirms. One that fails stays and is tried again on the next sweep.
 */
export async function sweepRetiring(
	ctx: TUseCaseContext,
	organizationId: string,
): Promise<void> {
	const rows = await ctx.db
		.select()
		.from(integrationConnection)
		.where(
			and(
				eq(integrationConnection.organizationId, organizationId),
				eq(integrationConnection.status, "retiring"),
			),
		);
	for (const row of rows) {
		try {
			// No account id: Composio never created one, or its connect records it and sweeps.
			if (row.composioConnectedAccountId) {
				await ctx.integrations.remove(row.composioConnectedAccountId);
			}
			await ctx.db
				.delete(integrationConnection)
				.where(eq(integrationConnection.id, row.id));
		} catch (err) {
			ctx.logger.warn(
				{ err, connectedAccountId: row.composioConnectedAccountId },
				"Composio connected account not removed; retried on the next sweep",
			);
		}
	}
}

/** Mark rows retiring (they stop counting), then sweep the organization. */
export async function retireConnections(
	ctx: TUseCaseContext,
	organizationId: string,
	ids: string[],
): Promise<void> {
	if (ids.length > 0) {
		await ctx.db
			.update(integrationConnection)
			.set({ status: "retiring" })
			.where(inArray(integrationConnection.id, ids));
	}
	await sweepRetiring(ctx, organizationId);
}

/**
 * Bring a pending row in line with Composio. Live: it becomes the organization's connection to
 * the provider and every other row for that provider retires. Failed: it retires. Still pending,
 * or Composio unreachable: it waits for the next look.
 */
export async function settleConnection(
	ctx: TUseCaseContext,
	row: TConnectionRow,
): Promise<TConnectedAccountState> {
	if (row.status !== "pending") {
		return row.status === "active" ? "active" : "failed";
	}

	// Composio is still creating the account.
	if (!row.composioConnectedAccountId) return "pending";

	let state: TConnectedAccountState;
	try {
		state = await ctx.integrations.getState(row.composioConnectedAccountId);
	} catch (err) {
		ctx.logger.warn(
			{ err, connectionId: row.id },
			"Composio state unknown; the connection stays pending",
		);
		return "pending";
	}

	// Lock the row and look again: a newer connect or a disconnect may have retired it since it
	// was read, and only a row still pending may change here.
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
		if (state === "failed") {
			await tx
				.update(integrationConnection)
				.set({ status: "retiring" })
				.where(eq(integrationConnection.id, row.id));
			return "failed" as const;
		}
		if (state === "active") {
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
		}
		return state;
	});
	await sweepRetiring(ctx, row.organizationId);
	return settled;
}

/** Settle every pending row of the organization, so one that went live after its callback shows. */
export async function settlePendingConnections(
	ctx: TUseCaseContext,
	organizationId: string,
): Promise<void> {
	const pending = await ctx.db
		.select()
		.from(integrationConnection)
		.where(
			and(
				eq(integrationConnection.organizationId, organizationId),
				eq(integrationConnection.status, "pending"),
			),
		);
	for (const row of pending) await settleConnection(ctx, row);
	await sweepRetiring(ctx, organizationId);
}
