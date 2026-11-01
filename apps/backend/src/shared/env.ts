import { envVar } from "@frubble/db/env";
import { z } from "zod";

// Environment parsing, shared by every config module. Each declares a zod schema for the
// variables it reads and parses them here, so a bad value fails at startup with the variable named.

export { envVar };

/** A TCP port, from its decimal string. */
const portSchema = z.coerce.number().int().min(1).max(65535);

/** Where a process listens: Cloud Run sets PORT, everything else takes the defaults. */
export const listenEnvFields = {
	HOST: envVar(z.string().min(1).default("0.0.0.0")),
	PORT: envVar(portSchema.default(8080)),
};

/** Parse `env` as `schema`. Throws one error naming every missing variable and every bad value. */
export function parseEnv<TSchema extends z.ZodType>(
	schema: TSchema,
	env: Record<string, string | undefined>,
	what = "environment",
): z.output<TSchema> {
	const parsed = schema.safeParse(env);
	if (parsed.success) return parsed.data;

	const missing: string[] = [];
	const problems: string[] = [];
	for (const issue of parsed.error.issues) {
		const name = issue.path.map(String).join(".");
		const raw = name ? env[name] : undefined;
		const unset = name !== "" && (raw === undefined || raw.trim() === "");
		if (unset && !missing.includes(name)) missing.push(name);
		if (unset && issue.code === "invalid_type") continue;
		problems.push(name ? `${name}: ${issue.message}` : issue.message);
	}
	const lines = [`Invalid ${what}.`];
	if (missing.length > 0) {
		lines.push(`Missing required environment variables: ${missing.join(", ")}`);
	}
	throw new Error([...lines, ...problems].join("\n"));
}
