import { defineConfig } from "drizzle-kit";
import { databaseUrl, dbConnectionFromEnv, dbEnvSchema } from "./src/lib/env";

// drizzle-kit runs from a shell: locally these defaults match docker-compose,
// and any DB_* variable in the environment overrides them. No dotenv.
const LOCAL_DEFAULTS = {
	DB_HOST: "localhost",
	DB_PORT: "5432",
	DB_NAME: "frubble",
	DB_USER: "frubble",
	DB_PASSWORD: "frubble_dev",
};

const env = dbEnvSchema.parse({
	...LOCAL_DEFAULTS,
	...Object.fromEntries(
		Object.entries(process.env).filter(
			([name, value]) => name in dbEnvSchema.shape && value,
		),
	),
});

export default defineConfig({
	dialect: "postgresql",
	schema: "./src/schema/*.ts",
	out: "./drizzle",
	dbCredentials: {
		url: databaseUrl(dbConnectionFromEnv(env)),
	},
});
