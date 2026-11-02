import type { TDb } from "@frubble/db";
import { user } from "@frubble/db/schema";
import { eq } from "drizzle-orm";

/** The id of the account with this (normalized) email, if any. */
export async function findUserIdByEmail(
	db: TDb,
	email: string,
): Promise<string | undefined> {
	const [row] = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.email, email))
		.limit(1);
	return row?.id;
}
