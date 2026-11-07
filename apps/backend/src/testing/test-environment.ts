import type { TDb } from "@frubble/db";
import { createAuth, type TAuth } from "@/better-auth";
import { staticConfigSections, type TConfig } from "@/config";
import { CONNECT_THROUGH } from "@/config/integrations";
import { githubConfig } from "@/config/integrations/github";
import { testLogger } from "./test-logger";

/** createAuth for tests. */
export function buildTestAuth(db: TDb, config: TConfig): TAuth {
	return createAuth(db, config, testLogger);
}

/** The config fixture. The database values only satisfy the type: tests get a clone's db. */
export function buildTestConfig(): TConfig {
	return {
		appEnv: "local",
		db: {
			user: "test",
			password: "test",
			host: "localhost",
			port: "5432",
			name: "frubble_test",
			caPem: undefined,
		},
		betterAuth: {
			url: "http://localhost:8080",
			secret: "test-secret-at-least-32-characters!!",
		},
		cors: { origin: ["http://localhost:3000"] },
		publicUrl: "http://localhost:8080",
		appUrl: "http://localhost:3000",
		integrations: {
			// What every environment uses, so the tests connect the way production does.
			connectThrough: CONNECT_THROUGH,
			osiris: {
				url: "http://osiris.test",
				apiKey: "test-osiris-key",
				authConfigIds: {
					github: "ac_test_github",
					linear: "ac_test_linear",
					slack: "ac_test_slack",
				},
			},
			composio: {
				apiKey: "test-composio-key",
				authConfigIds: {
					github: "ac_test_github",
					linear: "ac_test_linear",
					slack: "ac_test_slack",
				},
				proxyMaxPages: 10,
			},
			github: githubConfig({ GITHUB_APP_SLUG: "frubble-ai" }),
		},
		pubsub: { emailsTopic: "emails" },
		api: { host: "127.0.0.1", port: 8080, trustedProxies: 1 },
		...staticConfigSections(),
	};
}

/** Env vars global-setup uses to hand the database and the seeded users to each worker. */
export const TEST_DB_CONNECTION_ENV = "TEST_DB_CONNECTION";
export const TEST_SEED_USERS_ENV = "TEST_SEED_USERS";
