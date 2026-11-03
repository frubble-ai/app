import {
	integrationConnection,
	integrationProviderEnum,
	type TIntegrationProvider,
} from "@frubble/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { TUseCaseContext } from "@/use-cases";
import { notFound } from "@/use-cases/lib/shared/domain-errors";

export const integrationProviderSchema = z.enum(
	integrationProviderEnum.enumValues,
);

/** The organization's live connection to a provider, or not found. */
export async function requireActiveConnection(
	ctx: TUseCaseContext,
	args: { organizationId: string; provider: TIntegrationProvider },
) {
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
	if (!row) throw notFound(`${args.provider} is not connected.`);
	return row;
}

/** Drop connected accounts at Composio; one that fails is logged, not retried. */
export async function removeConnectedAccounts(
	ctx: TUseCaseContext,
	connectedAccountIds: string[],
): Promise<void> {
	for (const id of connectedAccountIds) {
		try {
			await ctx.integrations.remove(id);
		} catch (err) {
			ctx.logger.warn(
				{ err, connectedAccountId: id },
				"Composio connected account not removed",
			);
		}
	}
}
