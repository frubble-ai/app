import { tlsAgainstInstanceCa } from "@frubble/db";
import { databaseUrl, dbConnectionFromEnv, dbEnvSchema } from "@frubble/db/env";
import { resetDatabase, runMigrations } from "@frubble/db/migrate";
import { z } from "zod";
import { logger } from "@/logger";
import { envVar, parseEnv } from "@/shared/env";

// Opt-in with SHOULD_RUN_MIGRATION=true exactly, so the script run anywhere but the migration
// job is a logged no-op: any other value, `TRUE` or `1` included, exits 0 without migrating.
const { SHOULD_RUN_MIGRATION } = parseEnv(
	z.object({ SHOULD_RUN_MIGRATION: envVar(z.string().optional()) }),
	process.env,
	"migration environment",
);
if (SHOULD_RUN_MIGRATION !== "true") {
	logger.info(
		`Migration will not run: SHOULD_RUN_MIGRATION is '${process.env.SHOULD_RUN_MIGRATION ?? "undefined"}', expected 'true'.`,
	);
	process.exit(0);
}

// `--reset` drops what the migrations made first, so they run on an empty database: the reset
// workflow passes it, on dev or stg only. Only local, dev and stg take it; any other APP_ENV, or
// none, refuses.
const reset = process.argv.includes("--reset");

// Only the database variables, not the API's whole config.
const env = parseEnv(
	dbEnvSchema.extend({ APP_ENV: envVar(z.string().optional()) }),
	process.env,
	"migration environment",
);

const RESETTABLE_ENVS = ["local", "dev", "stg"];
if (reset && !RESETTABLE_ENVS.includes(env.APP_ENV ?? "")) {
	logger.error(
		`--reset is refused with APP_ENV '${env.APP_ENV ?? "unset"}': only local, dev and stg reset`,
	);
	process.exit(1);
}

const isLocal = env.APP_ENV === "local";
if (!isLocal && !env.DB_CA_PEM) {
	logger.error("DB_CA_PEM is required outside APP_ENV=local");
	process.exit(1);
}
const ssl =
	isLocal || !env.DB_CA_PEM ? undefined : tlsAgainstInstanceCa(env.DB_CA_PEM);

const connection = dbConnectionFromEnv(env);
logger.info(
	`Migrating ${connection.host}:${connection.port}/${connection.name}`,
);
let code = 0;
try {
	if (reset) {
		logger.warn(
			`Resetting ${connection.host}:${connection.port}/${connection.name}`,
		);
		await resetDatabase(databaseUrl(connection), ssl);
	}
	await runMigrations(databaseUrl(connection), ssl);
	logger.info("Migrations completed.");
} catch (err) {
	logger.error({ err }, "Migrations failed");
	code = 1;
}
process.exit(code);
