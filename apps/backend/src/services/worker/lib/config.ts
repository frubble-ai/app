import { z } from "zod";
import { appEnvSchema, type TAppEnv } from "@/config";
import {
	EMAIL_PROVIDERS,
	type TEmailProvider,
	type TEmailProviderConfig,
} from "@/services/worker/email/providers";
import { envVar, listenEnvFields, parseEnv } from "@/shared/env";

export type TWorkerConfig = {
	appEnv: TAppEnv;
	/** Which adapter sends; `none` logs each email instead (never in prd). */
	provider: TEmailProvider;
	/** What the adapter is given; null when the provider is `none`. */
	email: TEmailProviderConfig | null;
	/** Footer link in every email. */
	supportUrl: string | undefined;
	host: string;
	port: number;
};

const workerEnvSchema = z
	.object({
		APP_ENV: envVar(appEnvSchema),
		EMAIL_PROVIDER: envVar(z.enum(EMAIL_PROVIDERS).default("none")),
		EMAIL_API_KEY: envVar(z.string().min(1).optional()),
		EMAIL_API_URL: envVar(z.url().optional()),
		EMAIL_DOMAIN: envVar(z.string().min(1).optional()),
		EMAIL_FROM: envVar(z.email().default("noreply@frubble.ai")),
		EMAIL_FROM_NAME: envVar(z.string().min(1).default("Frubble")),
		EMAIL_SUPPORT_URL: envVar(z.url().optional()),
		...listenEnvFields,
	})
	.superRefine((env, context) => {
		if (env.EMAIL_PROVIDER !== "none") {
			for (const name of ["EMAIL_API_KEY", "EMAIL_DOMAIN"] as const) {
				if (env[name] === undefined) {
					context.addIssue({
						code: "custom",
						path: [name],
						message: `${name} is required when EMAIL_PROVIDER is ${env.EMAIL_PROVIDER}`,
					});
				}
			}
		}
		// The API refuses prd without delivery too; this names the worker's own consequence.
		if (env.APP_ENV === "prd" && env.EMAIL_PROVIDER === "none") {
			context.addIssue({
				code: "custom",
				path: ["EMAIL_PROVIDER"],
				message:
					"EMAIL_PROVIDER is required in prd: without it the worker would log emails instead of sending them",
			});
		}
	});

/** The worker's env. Fails at boot on anything missing or malformed. */
export function getWorkerConfig(
	env: Record<string, string | undefined> = process.env,
): TWorkerConfig {
	const parsed = parseEnv(workerEnvSchema, env, "worker environment");
	const delivering =
		parsed.EMAIL_PROVIDER !== "none" &&
		parsed.EMAIL_API_KEY !== undefined &&
		parsed.EMAIL_DOMAIN !== undefined;
	return {
		appEnv: parsed.APP_ENV,
		provider: parsed.EMAIL_PROVIDER,
		email: delivering
			? {
					apiKey: parsed.EMAIL_API_KEY as string,
					apiUrl: parsed.EMAIL_API_URL,
					domain: parsed.EMAIL_DOMAIN as string,
					fromEmail: parsed.EMAIL_FROM,
					fromName: parsed.EMAIL_FROM_NAME,
				}
			: null,
		supportUrl: parsed.EMAIL_SUPPORT_URL,
		host: parsed.HOST,
		port: parsed.PORT,
	};
}
