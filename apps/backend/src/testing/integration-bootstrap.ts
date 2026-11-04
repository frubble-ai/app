import type { TDb } from "@frubble/db";
import { setConfigForTests, type TConfig } from "@/config";
import { resetCtx, setCtxForTests } from "@/use-cases";
import {
	createCapturedMessages,
	type TCapturedMessages,
} from "./capture-messages";
import {
	createMockConnectionBroker,
	type TMockConnectionBroker,
} from "./mock-connection-broker";
import { createDbCloner } from "./test-db";
import {
	buildTestAuth,
	buildTestConfig,
	TEST_DB_CONNECTION_ENV,
	TEST_SEED_USERS_ENV,
} from "./test-environment";
import { testLogger } from "./test-logger";

export type TIntegrationContext = {
	cloner: ReturnType<typeof createDbCloner>;
	/** Email to user id, from the seed. */
	seedUsers: Record<string, string>;
};

/** A per-test clone with its own auth and use-case context. */
export type TTestClone = {
	db: TDb;
	auth: ReturnType<typeof buildTestAuth>["auth"];
	sessionCache: ReturnType<typeof buildTestAuth>["sessionCache"];
	captured: TCapturedMessages;
	/** The broker every connection in this test is on: the test sets its answers. */
	broker: TMockConnectionBroker;
	cleanup: () => Promise<void>;
};

/** Per-file setup: attach to the container global-setup started. */
export async function bootstrapIntegration(): Promise<TIntegrationContext> {
	const connectionString = process.env[TEST_DB_CONNECTION_ENV];
	if (!connectionString) {
		throw new Error(
			`bootstrapIntegration: ${TEST_DB_CONNECTION_ENV} not set; vitest globalSetup (src/testing/global-setup.ts) did not run`,
		);
	}
	const seedUsers: Record<string, string> = JSON.parse(
		process.env[TEST_SEED_USERS_ENV] ?? "{}",
	);
	return { cloner: createDbCloner(connectionString), seedUsers };
}

export async function teardownIntegration(
	context: TIntegrationContext | undefined,
): Promise<void> {
	if (!context) return;
	await context.cloner.close();
	resetCtx();
}

/** Fork a per-test clone and register it as the use-case context. Call `cleanup()` after the test. */
export async function cloneForTest(
	context: TIntegrationContext,
	options: { config?: Partial<TConfig> } = {},
): Promise<TTestClone> {
	const clone = await context.cloner.clone();
	const config: TConfig = { ...buildTestConfig(), ...options.config };
	const { auth, sessionCache } = buildTestAuth(clone.db, config);
	const captured = createCapturedMessages();
	const broker = createMockConnectionBroker();

	setConfigForTests(config);
	setCtxForTests({
		config,
		db: clone.db,
		messages: captured.messages,
		auth,
		sessionCache,
		integrations: {
			brokers: { composio: broker.broker },
			connectThrough: "composio",
		},
		logger: testLogger,
	});

	return {
		db: clone.db,
		auth,
		sessionCache,
		captured,
		broker,
		async cleanup() {
			resetCtx();
			await clone.cleanup();
		},
	};
}
