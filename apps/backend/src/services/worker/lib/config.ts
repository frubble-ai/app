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
	/** Required on every push when set: locally, where no invoker check guards the port. */
	pushToken: string | undefined;
	host: string;
	port: number;
};

const workerEnvSchema = z
	.object({
		APP_ENV: envVar(appEnvSchema),
		EMAIL_PROVIDER: envVar(z.enum(EMAIL_PROVIDERS)),
		EMAIL_API_KEY: envVar(z.string().min(1)),
		EMAIL_API_URL: envVar(z.url().optional()),
		EMAIL_DOMAIN: envVar(z.string().min(1)),
		// Defaults to noreply@ the sending domain: the address must be on the domain the provider verified.
		EMAIL_FROM: envVar(z.email().optional()),
		EMAIL_FROM_NAME: envVar(z.string().min(1).default("Frubble")),
		EMAIL_SUPPORT_URL: envVar(z.url().optional()),
		// Cloud Run's invoker check and internal ingress guard the push route in stg and prd.
		// Locally nothing does, so a token in the subscription's push URL takes their place.
		PUSH_TOKEN: envVar(z.string().min(32).optional()),
		...listenEnvFields,
	})
	.superRefine((env, context) => {
		// The key travels in every request; only a local stand-in may take it in clear.
		if (
			env.APP_ENV !== "local" &&
			env.EMAIL_API_URL !== undefined &&
			!env.EMAIL_API_URL.startsWith("https://")
		) {
			context.addIssue({
				code: "custom",
				path: ["EMAIL_API_URL"],
				message: "EMAIL_API_URL must be https outside APP_ENV=local",
			});
		}
		if (env.APP_ENV === "local" && env.PUSH_TOKEN === undefined) {
			context.addIssue({
				code: "custom",
				path: ["PUSH_TOKEN"],
				message:
					"PUSH_TOKEN is required with APP_ENV=local: nothing else guards the push route (yarn local:create sets it)",
			});
		}
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
			fromEmail: parsed.EMAIL_FROM ?? `noreply@${parsed.EMAIL_DOMAIN}`,
			fromName: parsed.EMAIL_FROM_NAME,
		},
		supportUrl: parsed.EMAIL_SUPPORT_URL,
		pushToken: parsed.PUSH_TOKEN,
		host: parsed.HOST,
		port: parsed.PORT,
	};
}
