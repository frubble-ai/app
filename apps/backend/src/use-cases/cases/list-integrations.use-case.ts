import { integrationConnection, type TIntegrationProvider } from "@frubble/db";
import { and, asc, eq } from "drizzle-orm";
import { DateTime } from "luxon";
import { z } from "zod";
import { defineUseCase } from "@/use-cases";
import { settlePendingIntegrationsUseCase } from "@/use-cases/cases/settle-pending-integrations.use-case";
import {
	betterAuthIdSchema,
	requireMembership,
} from "@/use-cases/lib/organizations/membership";

const listIntegrationsArgsSchema = z.object({
	userId: z.string().min(1),
	organizationId: betterAuthIdSchema,
});

/**
 * The providers an organization has connected; any member may see them. Pending attempts are
 * settled first, so one that went live after its callback shows here.
 */
export const listIntegrationsUseCase = defineUseCase(
	async function listIntegrationsUseCase(
		ctx,
		args: { userId: string; organizationId: string },
	): Promise<Array<{ provider: TIntegrationProvider; connectedAt: DateTime }>> {
		const { userId, organizationId } = listIntegrationsArgsSchema.parse(args);
		await requireMembership(ctx.db, { userId, organizationId });
		await settlePendingIntegrationsUseCase({ organizationId });
		const rows = await ctx.db
			.select({
				provider: integrationConnection.provider,
				updatedAt: integrationConnection.updatedAt,
			})
			.from(integrationConnection)
			.where(
				and(
					eq(integrationConnection.organizationId, organizationId),
					eq(integrationConnection.status, "active"),
				),
			)
			.orderBy(asc(integrationConnection.provider));
		return rows.map((row) => ({
			provider: row.provider,
			connectedAt: DateTime.fromJSDate(row.updatedAt, { zone: "utc" }),
		}));
	},
);
