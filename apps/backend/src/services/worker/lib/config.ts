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
	/** Which adapter sends. */
	provider: TEmailProvider;
	/** What the adapter is given. */
	email: TEmailProviderConfig;
	/** Footer link in every email. */
	supportUrl: string | undefined;
	host: string;
	port: number;
};

const workerEnvSchema = z.object({
	APP_ENV: envVar(appEnvSchema),
	EMAIL_PROVIDER: envVar(z.enum(EMAIL_PROVIDERS)),
	EMAIL_API_KEY: envVar(z.string().min(1)),
	EMAIL_API_URL: envVar(z.url().optional()),
	EMAIL_DOMAIN: envVar(z.string().min(1)),
	EMAIL_FROM: envVar(z.email().default("noreply@frubble.ai")),
	EMAIL_FROM_NAME: envVar(z.string().min(1).default("Frubble")),
	EMAIL_SUPPORT_URL: envVar(z.url().optional()),
	...listenEnvFields,
});

/** The worker's env. Fails at boot on anything missing or malformed. */
export function getWorkerConfig(
	env: Record<string, string | undefined> = process.env,
): TWorkerConfig {
	const parsed = parseEnv(workerEnvSchema, env, "worker environment");
	return {
		appEnv: parsed.APP_ENV,
		provider: parsed.EMAIL_PROVIDER,
		email: {
			apiKey: parsed.EMAIL_API_KEY,
			apiUrl: parsed.EMAIL_API_URL,
			domain: parsed.EMAIL_DOMAIN,
			fromEmail: parsed.EMAIL_FROM,
			fromName: parsed.EMAIL_FROM_NAME,
		},
		supportUrl: parsed.EMAIL_SUPPORT_URL,
		host: parsed.HOST,
		port: parsed.PORT,
	};
}
