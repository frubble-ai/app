import {
	INTEGRATION_PROVIDERS,
	integrationConnection,
	type TDb,
	type TIntegrationProvider,
} from "@frubble/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { notFound } from "@/use-cases/lib/shared/domain-errors";

export const integrationProviderSchema = z.enum(INTEGRATION_PROVIDERS);

/** The organization's live connection to a provider, or not found. */
export async function requireActiveConnection(
	db: TDb,
	args: { organizationId: string; provider: TIntegrationProvider },
): Promise<{ id: string; composioConnectedAccountId: string }> {
	const [row] = await db
		.select({
			id: integrationConnection.id,
			composioConnectedAccountId:
				integrationConnection.composioConnectedAccountId,
		})
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
	return {
		id: row.id,
		composioConnectedAccountId: row.composioConnectedAccountId,
	};
}
