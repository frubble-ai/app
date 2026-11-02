import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate as drizzleMigrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

/** `packages/db/drizzle`, what drizzle-kit generates into. */
export const migrationsFolder = resolve(import.meta.dirname, "../../drizzle");

/**
 * Everything the migrations made, gone: every table and enum the connecting user owns in `public`,
 * and drizzle's record of what ran. Only what this user owns, so a table someone else made stays.
 */
const DROP_OWNED_SQL = `
DO $$
DECLARE item record;
BEGIN
	FOR item IN
		SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tableowner = current_user
	LOOP
		EXECUTE format('DROP TABLE public.%I CASCADE', item.tablename);
	END LOOP;
	FOR item IN
		SELECT type.typname FROM pg_type type
		JOIN pg_namespace namespace ON namespace.oid = type.typnamespace
		WHERE namespace.nspname = 'public' AND type.typtype = 'e'
			AND pg_get_userbyid(type.typowner) = current_user
	LOOP
		EXECUTE format('DROP TYPE public.%I CASCADE', item.typname);
	END LOOP;
END
$$;
DROP SCHEMA IF EXISTS drizzle CASCADE;
`;

/** Drops what the migrations made, so the next `runMigrations` starts from nothing. */
export async function resetDatabase(
	connectionString: string,
	ssl?: pg.PoolConfig["ssl"],
): Promise<void> {
	const pool = new pg.Pool({ connectionString, ssl });
	await pool.query(DROP_OWNED_SQL);
	await pool.end();
}

export async function runMigrations(
	connectionString: string,
	ssl?: pg.PoolConfig["ssl"],
): Promise<void> {
	const pool = new pg.Pool({ connectionString, ssl });
	const db = drizzle(pool);
	await drizzleMigrate(db, { migrationsFolder });
	await pool.end();
}
