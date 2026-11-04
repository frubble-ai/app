import {
	INTEGRATION_PROVIDERS,
	integrationConnection,
	type TDb,
	type TIntegrationBroker,
	type TIntegrationProvider,
} from "@frubble/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { notFound } from "@/use-cases/lib/shared/domain-errors";

export const integrationProviderSchema = z.enum(INTEGRATION_PROVIDERS);

/** The organization's live connection to a provider, with its broker and account, or not found. */
export async function requireActiveConnection(
	db: TDb,
	args: { organizationId: string; provider: TIntegrationProvider },
): Promise<{ id: string; broker: TIntegrationBroker; accountRef: string }> {
	const [row] = await db
		.select({
			id: integrationConnection.id,
			broker: integrationConnection.broker,
			accountRef: integrationConnection.externalAccountRef,
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
	if (!row?.accountRef) {
		throw notFound(`${args.provider} is not connected.`);
	}
	return { id: row.id, broker: row.broker, accountRef: row.accountRef };
}
