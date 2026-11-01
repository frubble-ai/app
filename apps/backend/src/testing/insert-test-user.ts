import { faker } from "@faker-js/faker";
import { type TDb, type TUserRole, user as userTable } from "@frubble/db";
import { DateTime } from "luxon";
import type { IAuthenticatedUser } from "@/services/api/graphql/shared/lib/guards";

/** Insert a bare `user` row (no sign-up hooks, no password). */
export async function insertTestUser(
	db: TDb,
	options: Partial<{
		id: string;
		name: string;
		email: string;
		role: TUserRole;
		emailVerified: boolean;
	}> = {},
): Promise<IAuthenticatedUser> {
	const id = options.id ?? faker.string.alphanumeric(32);
	const name = options.name ?? faker.person.fullName();
	const email =
		options.email ??
		`test+${faker.string.alphanumeric(10).toLowerCase()}@example.com`;
	const role: TUserRole = options.role ?? "customer";
	const now = DateTime.utc().toJSDate();

	await db.insert(userTable).values({
		id,
		name,
		email,
		emailVerified: options.emailVerified ?? true,
		role,
		createdAt: now,
		updatedAt: now,
	});

	return { id, name, email, role };
}
