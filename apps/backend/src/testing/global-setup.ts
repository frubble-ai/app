import path from "node:path";
import { createDb } from "@frubble/db";
import { runSeed, type TSeedContext } from "@frubble/seed";
import {
	PostgreSqlContainer,
	type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { setConfigForTests } from "@/config";
import { resetCtx, setCtxForTests } from "@/use-cases";
import { createCapturedMessages } from "./capture-messages";
import { createDbCloner } from "./test-db";
import {
	buildTestAuth,
	buildTestConfig,
	TEST_DB_CONNECTION_ENV,
	TEST_SEED_USERS_ENV,
} from "./test-environment";
import { testLogger } from "./test-logger";

/**
 * Once per vitest run: one Postgres container, migrated and seeded into a template database.
 * Each test clones that template, which takes milliseconds.
 */
let container: StartedPostgreSqlContainer | undefined;
let cloner: ReturnType<typeof createDbCloner> | undefined;

export async function setup(): Promise<void> {
	container = await new PostgreSqlContainer("postgres:16-alpine").start();

	const connectionString = container.getConnectionUri();
	const baseDb = createDb(connectionString, {
		onIdleClientError: (err) => {
			throw err;
		},
	});

	await migrate(baseDb, {
		migrationsFolder: path.resolve(
			__dirname,
			"../../../../packages/db/drizzle",
		),
	});

	const config = buildTestConfig();
	setConfigForTests(config);

	// Seed through the API's own Better Auth, as `yarn db:seed` does.
	const captured = createCapturedMessages();
	const { auth, sessionCache } = buildTestAuth(baseDb, config);
	setCtxForTests({
		config,
		db: baseDb,
		messages: captured.messages,
		auth,
		sessionCache,
		logger: testLogger,
	});

	const seedContext: TSeedContext = {
		db: baseDb,
		users: {},
		signUp: async (body) => (await auth.api.signUpEmail({ body })).user,
	};
	await runSeed(seedContext);

	// Postgres needs no live session on the source to take a template snapshot.
	await baseDb.$client.end();
	resetCtx();

	cloner = createDbCloner(connectionString);
	await cloner.createTemplate();

	// Vitest forks its workers after `setup()` resolves, so they inherit these.
	process.env[TEST_DB_CONNECTION_ENV] = connectionString;
	process.env[TEST_SEED_USERS_ENV] = JSON.stringify(seedContext.users);
}

export async function teardown(): Promise<void> {
	if (cloner) {
		await cloner.close();
	}
	await container?.stop();
}
