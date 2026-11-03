import { integrationConnection } from "@frubble/db";
import { inArray } from "drizzle-orm";
import { z } from "zod";
import { defineUseCase } from "@/use-cases";
import { sweepRetiringIntegrationsUseCase } from "@/use-cases/cases/sweep-retiring-integrations.use-case";
import { betterAuthIdSchema } from "@/use-cases/lib/organizations/membership";

const retireIntegrationConnectionsArgsSchema = z.object({
	organizationId: betterAuthIdSchema,
	connectionIds: z.array(z.uuid()),
});

/** Mark connections retiring (they stop counting), then sweep the organization. */
export const retireIntegrationConnectionsUseCase = defineUseCase(
	async function retireIntegrationConnectionsUseCase(
		ctx,
		args: { organizationId: string; connectionIds: string[] },
	): Promise<void> {
		const { organizationId, connectionIds } =
			retireIntegrationConnectionsArgsSchema.parse(args);
		if (connectionIds.length > 0) {
			await ctx.db
				.update(integrationConnection)
				.set({ status: "retiring" })
				.where(inArray(integrationConnection.id, connectionIds));
		}
		await sweepRetiringIntegrationsUseCase({ organizationId });
	},
);
