import {
	INTEGRATION_PROVIDERS,
	integrationConnection,
	type TDb,
	type TIntegrationBroker,
	type TIntegrationProvider,
} from "@frubble/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
	INTEGRATION_ACTION_PROVIDERS,
	type TIntegrationAction,
	type TIntegrationActions,
	type TIntegrations,
} from "@/integrations";
import { requireMembership } from "@/use-cases/lib/organizations/membership";
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

/**
 * Run `action` through the organization's live connection to the action's provider, on the broker
 * that connection is on. Any member may: not a member is not found, and so is a provider that is
 * not connected.
 */
export async function runThroughConnection<TAction extends TIntegrationAction>(
	db: TDb,
	integrations: TIntegrations,
	args: {
		userId: string;
		organizationId: string;
		action: TAction;
		input: TIntegrationActions[TAction]["input"];
	},
): Promise<TIntegrationActions[TAction]["output"]> {
	const { userId, organizationId, action, input } = args;
	await requireMembership(db, { userId, organizationId });
	const connection = await requireActiveConnection(db, {
		organizationId,
		provider: INTEGRATION_ACTION_PROVIDERS[action],
	});
	return integrations.brokers[connection.broker].run(
		action,
		{ organizationId, accountRef: connection.accountRef },
		input,
	);
}
