import type { TDb } from "@frubble/db";
import { seedUsers } from "./lib/users";

/**
 * What the seed needs: the database and the API's own Better Auth sign-up, so seeded users go
 * through the same hooks as real ones.
 */
export type TSeedContext = {
	db: TDb;
	signUp: (body: {
		name: string;
		email: string;
		password: string;
	}) => Promise<{ id: string }>;
	/** Email to user id, filled as users are seeded. */
	users: Record<string, string>;
};

export async function runSeed(context: TSeedContext): Promise<void> {
	await seedUsers(context);
}
