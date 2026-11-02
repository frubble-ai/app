import { user as userTable } from "@frubble/db";
import { eq } from "drizzle-orm";
import type { TSeedContext } from "../index";

const SEED_PASSWORD = "password123";

type TSeedUser = {
	email: string;
	name: string;
};

/** Two users. Re-runs converge: a user that exists is updated, not duplicated. */
const SEED_USERS: TSeedUser[] = [
	{ email: "user.1@example.com", name: "User One" },
	{ email: "user.2@example.com", name: "User Two" },
];

async function upsertAccount(
	context: TSeedContext,
	seedUser: TSeedUser,
): Promise<string> {
	const [existing] = await context.db
		.select({ id: userTable.id })
		.from(userTable)
		.where(eq(userTable.email, seedUser.email))
		.limit(1);
	const userId =
		existing?.id ??
		(
			await context.signUp({
				name: seedUser.name,
				email: seedUser.email,
				password: SEED_PASSWORD,
			})
		).id;

	await context.db
		.update(userTable)
		.set({ emailVerified: true })
		.where(eq(userTable.id, userId));
	return userId;
}

export async function seedUsers(context: TSeedContext): Promise<void> {
	for (const seedUser of SEED_USERS) {
		context.users[seedUser.email] = await upsertAccount(context, seedUser);
	}
	console.log(`  Users: ${SEED_USERS.length} (password: ${SEED_PASSWORD})`);
	for (const seedUser of SEED_USERS) {
		console.log(`    ${seedUser.email}`);
	}
}
