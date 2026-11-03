import { z } from "zod";
import { envVar } from "@/shared/env";
import { initUseCaseContext } from "@/use-cases";
import { buildUseCaseContext } from "@/use-cases/build-use-case-context";
import { seedLocalUsersUseCase } from "@/use-cases/cases/seed-local-users.use-case";

// Seeds the local database through the API's own Better Auth, so seeded users are real sign-ups.
//   yarn db:seed
const seedEnv = z
	.object({
		APP_ENV: envVar(
			z.literal("local", {
				error: () =>
					"Seeding only runs against the local database (APP_ENV=local in apps/backend/.env.local).",
			}),
		),
	})
	.safeParse(process.env);
if (!seedEnv.success) {
	console.error(seedEnv.error.issues.map((issue) => issue.message).join("\n"));
	process.exit(1);
}

let code = 0;
try {
	await initUseCaseContext(buildUseCaseContext);
	console.log("Seeding database...\n");
	await seedLocalUsersUseCase({});
	console.log("\nSeed complete.");
} catch (err) {
	console.error("Seed failed:", err);
	code = 1;
}
process.exit(code);
