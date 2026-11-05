import { defineConfig } from "drizzle-kit";
import { drizzleCredentials } from "./src/lib/drizzle-credentials";
import { dbEnvSchema } from "./src/lib/env";

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
	// Structured, not a URL: drizzle-kit reads TLS settings only from structured credentials, and
	// this throws rather than connect in clear text when DB_CA_PEM is set but unusable.
	dbCredentials: drizzleCredentials(env, process.env.APP_ENV),
});
