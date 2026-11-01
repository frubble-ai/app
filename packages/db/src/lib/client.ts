import type { Logger as DrizzleLogger } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../schema/index";

export interface ICreateDbOptions {
	/** pg's `ssl`: `{ ca, rejectUnauthorized: true }` to pin the server's CA. Unset locally. */
	ssl?: pg.PoolConfig["ssl"];
	/** Called once per statement with the rendered SQL and its parameters. */
	logger?: DrizzleLogger;
	/**
	 * The pool emits `error` when the server drops an idle connection (a restart, a failover). It
	 * replaces the connection and carries on, but with no listener the process crashes.
	 */
	onIdleClientError: (error: Error) => void;
}

const POOL_MAX = 10;
const POOL_IDLE_TIMEOUT_MS = 60_000;
// A query waiting on an exhausted pool fails instead of waiting forever.
const POOL_CONNECTION_TIMEOUT_MS = 10_000;

export function createDb(connectionString: string, options: ICreateDbOptions) {
	const pool = new pg.Pool({
		connectionString,
		ssl: options.ssl,
		max: POOL_MAX,
		idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
		connectionTimeoutMillis: POOL_CONNECTION_TIMEOUT_MS,
		keepAlive: true,
	});
	pool.on("error", options.onIdleClientError);
	return drizzle(pool, { schema, logger: options.logger });
}

export type TDb = ReturnType<typeof createDb>;
