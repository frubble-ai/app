import pino, { type DestinationStream } from "pino";
import { z } from "zod";
import { envVar, parseEnv } from "@/shared/env";

const loggerEnvSchema = z.object({
	LOG_LEVEL: envVar(
		z
			.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
			.default("info"),
	),
	NODE_ENV: envVar(z.string().optional()),
	/** JSON lines (what Cloud Logging reads) or pino-pretty; JSON in production, pretty otherwise. */
	LOG_FORMAT: envVar(z.enum(["json", "pretty"]).optional()),
});

// Fields a line never shows, at the top level or one object down. Nothing sensitive is logged by
// design; this is the net under a future line that would.
const REDACTED_KEYS = [
	"password",
	"newPassword",
	"currentPassword",
	"token",
	"authorization",
	"cookie",
	"email",
];

const env = parseEnv(loggerEnvSchema, process.env, "logger environment");
const format =
	env.LOG_FORMAT ?? (env.NODE_ENV === "production" ? "json" : "pretty");

// pino-pretty is a dev dependency: loaded only when asked for.
async function destination(): Promise<DestinationStream> {
	if (format === "json") return pino.destination({ dest: 1, sync: true });
	const { default: pretty } = await import("pino-pretty");
	return pretty({ sync: true });
}

export const logger = pino(
	{
		level: env.LOG_LEVEL,
		timestamp: pino.stdTimeFunctions.isoTime,
		// Cloud Logging reads `severity`; pino's numeric level means nothing to it.
		formatters: {
			level: (label) => ({ level: label, severity: label.toUpperCase() }),
		},
		base: { service: process.env.APP_SERVICE ?? "backend" },
		redact: {
			paths: REDACTED_KEYS.flatMap((key) => [key, `*.${key}`]),
			censor: "[redacted]",
		},
	},
	await destination(),
);

export type TLogger = typeof logger;
