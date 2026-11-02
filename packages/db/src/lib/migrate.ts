import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate as drizzleMigrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

/** `packages/db/drizzle`, what drizzle-kit generates into. */
export const migrationsFolder = resolve(import.meta.dirname, "../../drizzle");

export async function runMigrations(
	connectionString: string,
	ssl?: pg.PoolConfig["ssl"],
): Promise<void> {
	const pool = new pg.Pool({ connectionString, ssl });
	const db = drizzle(pool);
	await drizzleMigrate(db, { migrationsFolder });
	await pool.end();
}
