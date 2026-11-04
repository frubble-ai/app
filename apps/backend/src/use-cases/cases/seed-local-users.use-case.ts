import { runSeed } from "@frubble/seed";
import { defineUseCase } from "@/use-cases";
import { forbidden } from "@/use-cases/lib/shared/domain-errors";

/**
 * The local users, signed up through the API's own Better Auth so they go through the same hooks
 * as real sign-ups. Only with APP_ENV=local. Answers each seeded email's user id.
 */
export const seedLocalUsersUseCase = defineUseCase(
	async function seedLocalUsersUseCase(
		ctx,
		_args: Record<string, never>,
	): Promise<Record<string, string>> {
		if (ctx.config.appEnv !== "local") {
			throw forbidden("Seeding only runs against the local database.");
		}
		const users: Record<string, string> = {};
		await runSeed({
			db: ctx.db,
			users,
			signUp: async (body) => (await ctx.auth.api.signUpEmail({ body })).user,
		});
		return users;
	},
);
