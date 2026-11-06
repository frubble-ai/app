import { faker } from "@faker-js/faker";
import type { TDb } from "@frubble/db";
import { sql } from "drizzle-orm";

type TFailingWrite = {
	table: "account" | "session" | "verification";
	event: "UPDATE" | "DELETE";
};

/**
 * Makes every `event` statement on `table` fail inside Postgres, so a test breaks a write at the
 * real boundary instead of stubbing the code that makes it. A statement trigger fires even when
 * the statement touches no rows. Returns the text the database error carries, and a function that
 * takes the trigger away again.
 */
export async function mockDatabaseWriteFailure(
	db: TDb,
	{ table, event }: TFailingWrite,
): Promise<{ marker: string; restore: () => Promise<void> }> {
	const suffix = faker.string.alphanumeric(10).toLowerCase();
	const marker = `write blocked by test ${suffix}`;
	const fn = sql.raw(`"test_fail_${suffix}"`);
	const trigger = sql.raw(`"test_fail_trg_${suffix}"`);
	const target = sql.raw(`"${table}"`);

	await db.execute(
		sql`CREATE FUNCTION ${fn}() RETURNS trigger LANGUAGE plpgsql AS $body$ BEGIN RAISE EXCEPTION '${sql.raw(marker)}'; END $body$`,
	);
	await db.execute(
		sql`CREATE TRIGGER ${trigger} BEFORE ${sql.raw(event)} ON ${target} FOR EACH STATEMENT EXECUTE FUNCTION ${fn}()`,
	);

	return {
		marker,
		restore: async () => {
			await db.execute(sql`DROP TRIGGER ${trigger} ON ${target}`);
			await db.execute(sql`DROP FUNCTION ${fn}()`);
		},
	};
}
