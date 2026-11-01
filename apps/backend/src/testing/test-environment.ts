import type { TDb } from "@frubble/db";
import { createAuth, type TAuth, type TAuthSessionCache } from "@/better-auth";
import { staticConfigSections, type TConfig } from "@/config";

/** createAuth for tests. */
export function buildTestAuth(
	db: TDb,
	config: TConfig,
): { auth: TAuth; sessionCache: TAuthSessionCache } {
	const result = createAuth(db, config);
	return { auth: result.auth, sessionCache: result.sessionCache };
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
		pubsub: { emailsTopic: "emails" },
		email: { delivery: "provider" },
		api: { host: "127.0.0.1", port: 8080, trustedProxies: 1 },
		...staticConfigSections(),
	};
}

/** Env vars global-setup uses to hand the database and the seeded users to each worker. */
export const TEST_DB_CONNECTION_ENV = "TEST_DB_CONNECTION";
export const TEST_SEED_USERS_ENV = "TEST_SEED_USERS";
