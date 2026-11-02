import { randomUUID } from "node:crypto";
import type { TDb } from "@frubble/db";
import { verification } from "@frubble/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Make `value` the only `verification` row for `identifier`, superseding any earlier one. Under an
 * advisory lock on the identifier, so two concurrent requests cannot both leave a row behind.
 */
export async function replaceVerification(
	db: TDb,
	identifier: string,
	value: string,
	expiresAt: Date,
): Promise<void> {
	await db.transaction(async (tx) => {
		await tx.execute(
			sql`SELECT pg_advisory_xact_lock(hashtext(${identifier}))`,
		);
		await tx
			.delete(verification)
			.where(eq(verification.identifier, identifier));
		await tx.insert(verification).values({
			id: randomUUID(),
			identifier,
			value,
			expiresAt,
		});
	});
}
