import { integrationConnection } from "@frubble/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { defineUseCase } from "@/use-cases";
import { settleIntegrationConnectionUseCase } from "@/use-cases/cases/settle-integration-connection.use-case";
import { sweepRetiringIntegrationsUseCase } from "@/use-cases/cases/sweep-retiring-integrations.use-case";
import { betterAuthIdSchema } from "@/use-cases/lib/organizations/membership";

const settlePendingIntegrationsArgsSchema = z.object({
	organizationId: betterAuthIdSchema,
});

/**
 * Settle every pending connection of the organization, so one that went live after its callback
 * shows, then retry any removal still owed.
 */
export const settlePendingIntegrationsUseCase = defineUseCase(
	async function settlePendingIntegrationsUseCase(
		ctx,
		args: { organizationId: string },
	): Promise<void> {
		const { organizationId } = settlePendingIntegrationsArgsSchema.parse(args);
		const pending = await ctx.db
			.select({ id: integrationConnection.id })
			.from(integrationConnection)
			.where(
				and(
					eq(integrationConnection.organizationId, organizationId),
					eq(integrationConnection.status, "pending"),
				),
			);
		for (const row of pending) {
			await settleIntegrationConnectionUseCase({ connectionId: row.id });
		}
		await sweepRetiringIntegrationsUseCase({ organizationId });
	},
);
