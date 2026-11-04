import { createDb, tlsAgainstInstanceCa } from "@frubble/db";
import { databaseUrl } from "@frubble/db/env";
import { createPubSubTransport } from "@frubble/events/pubsub";
import { PubSub } from "@google-cloud/pubsub";
import { createAuth } from "@/better-auth";
import { createComposioBroker } from "@/composio";
import { getConfig } from "@/config";
import { createAppMessageBus } from "@/events";
import type { TIntegrations } from "@/integrations";
import { logger } from "@/logger";
import type { TUseCaseContext } from "@/use-cases";

/** Postgres dropped an idle pooled connection: the pool replaces it, this reports it. */
function reportIdleClientError(err: Error): void {
	logger.error(
		{ err },
		"idle database connection dropped; the pool replaced it",
	);
}

/** The production use-case context. Kept out of use-cases/index.ts to avoid an import cycle. */
export async function buildUseCaseContext(): Promise<TUseCaseContext> {
	const config = getConfig();

	// Outside local the connection is TLS against the instance's own CA (`DB_CA_PEM`, which the
	// config requires there).
	const ssl =
		config.appEnv === "local" || config.db.caPem === undefined
			? undefined
			: tlsAgainstInstanceCa(config.db.caPem);

	const db = createDb(databaseUrl(config.db), {
		ssl,
		onIdleClientError: reportIdleClientError,
	});

	const messages = createAppMessageBus(
		createPubSubTransport({
			client: new PubSub(),
			topics: { emails: config.pubsub.emailsTopic },
		}),
	);

	const { auth, sessionCache } = createAuth(db, config);

	// Every broker a connection may be on; new connections go through `connectThrough`.
	const integrations: TIntegrations = {
		brokers: { composio: createComposioBroker(config.integrations.composio) },
		connectThrough: "composio",
	};

	return { config, db, messages, auth, sessionCache, integrations, logger };
}
