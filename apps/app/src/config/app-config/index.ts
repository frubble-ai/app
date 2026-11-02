import { z } from "zod";

/** The local API, unless GRAPHQL_URL names another; stg and prd always name theirs (platform). */
const LOCAL_GRAPHQL_URL = "http://localhost:8080/graphql";

const APP_ENVS = ["local", "stg", "prd"] as const;

/**
 * The app's environment, read by the server at request time (`app/layout.tsx`): one image serves
 * every environment, its container's variables deciding (docs/environment.md).
 */
const runtimeEnvSchema = z
	.object({
		/** The environment the container runs in: the service's `APP_ENV`. */
		APP_ENV: z.enum(APP_ENVS).default("local"),
		/** The API: the service's on stg and prd, where it's required; locally optional (stg's, say). */
		GRAPHQL_URL: z.url().optional(),
	})
	.refine((env) => env.APP_ENV === "local" || env.GRAPHQL_URL, {
		message: "GRAPHQL_URL is required outside local: the service names its API",
		path: ["GRAPHQL_URL"],
	});

export type TAppConfig = {
	appEnv: (typeof APP_ENVS)[number];
	graphqlUrl: string;
};

/** The app's config from an environment; a malformed value fails the page. */
export function buildAppConfig(env: Record<string, unknown>): TAppConfig {
	const parsed = runtimeEnvSchema.safeParse({
		APP_ENV: env.APP_ENV || undefined,
		GRAPHQL_URL: env.GRAPHQL_URL || undefined,
	});
	if (!parsed.success) {
		throw new Error(
			`Invalid app config (see docs/environment.md): ${z.prettifyError(parsed.error)}`,
		);
	}
	return {
		appEnv: parsed.data.APP_ENV,
		graphqlUrl: parsed.data.GRAPHQL_URL ?? LOCAL_GRAPHQL_URL,
	};
}

/**
 * The config the page runs with. A local one until `AppProviders` applies what the server read
 * (`applyAppConfig`), before anything renders that reads it.
 */
export const appConfig: TAppConfig = buildAppConfig({});

/** Applies the config the server read; the same every time for a page. */
export function applyAppConfig(config: TAppConfig): void {
	Object.assign(appConfig, config);
}
