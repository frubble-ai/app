import { createDb, type TDb } from "@frubble/db";
import pg from "pg";

/** Clones a template database per test (`CREATE DATABASE … TEMPLATE`), named by pid and counter. */
const TEMPLATE_DB = "frubble_api_template";
let cloneCounter = 0;

export function createDbCloner(connectionString: string) {
	const baseDb = connectionString.match(/\/([^/]+)$/)?.[1] ?? "frubble_test";
	const adminConnectionString = connectionString.replace(
		/\/[^/]+$/,
		"/postgres",
	);
	const adminPool = new pg.Pool({
		connectionString: adminConnectionString,
		max: 5,
	});

	async function terminateSessions(dbName: string): Promise<void> {
		await adminPool.query(
			`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${dbName}' AND pid <> pg_backend_pid()`,
		);
	}

	return {
		async createTemplate() {
			// A template snapshot needs no live session on the source database.
			await terminateSessions(baseDb);
			await adminPool.query(`DROP DATABASE IF EXISTS ${TEMPLATE_DB}`);
			await adminPool.query(
				`CREATE DATABASE ${TEMPLATE_DB} TEMPLATE "${baseDb}"`,
			);
		},

		async clone(): Promise<{
			db: TDb;
			connectionString: string;
			cleanup: () => Promise<void>;
		}> {
			const dbName = `frubble_api_t${process.pid}_${++cloneCounter}`;
			await adminPool.query(
				`CREATE DATABASE "${dbName}" TEMPLATE ${TEMPLATE_DB}`,
			);
			const cloneConnectionString = connectionString.replace(
				/\/[^/]+$/,
				`/${dbName}`,
			);
			const db = createDb(cloneConnectionString, {
				onIdleClientError: (err) => {
					throw err;
				},
			});

			return {
				db,
				connectionString: cloneConnectionString,
				async cleanup() {
					await db.$client.end();
					try {
						await adminPool.query(`DROP DATABASE IF EXISTS "${dbName}"`);
					} catch {
						// A pooled connection occasionally lingers past `end()`.
						await terminateSessions(dbName);
						await adminPool.query(`DROP DATABASE IF EXISTS "${dbName}"`);
					}
				},
			};
		},

		async close() {
			await adminPool.end();
		},
	};
}
