import { INTEGRATION_PROVIDERS, type TIntegrationProvider } from "@frubble/db";
import { dbEnvSchema } from "@frubble/db/env";
import { z } from "zod";
import { envVar, listenEnvFields, parseEnv } from "@/shared/env";

// Typed config parsed from env once at boot, so a missing key fails startup. Tests swap in a
// fixture with `setConfigForTests`.

export type TRateLimitRule = {
	/** Attempts allowed per window. */
	limit: number;
	windowMs: number;
};

/** A one-time emailed code flow (sign-up, password reset). */
export type TCodeFlowConfig = {
	/** Prefix on the verification row's `identifier` for this flow. */
	identifierPrefix: string;
	codeTtlMs: number;
	/** Wrong guesses allowed before the code is burned. */
	maxAttempts: number;
};

/** `local` is docker-compose; `stg` and `prd` are the deployed environments. */
const APP_ENVS = ["local", "stg", "prd"] as const;
export type TAppEnv = (typeof APP_ENVS)[number];

/** The schema every process parses `APP_ENV` with. */
export const appEnvSchema = z.enum(APP_ENVS, {
	error: () => `APP_ENV must be one of ${APP_ENVS.join(", ")}`,
});

export type TConfig = {
	appEnv: TAppEnv;
	db: {
		user: string;
		password: string;
		host: string;
		port: string;
		name: string;
		/** The server's CA, PEM. Unset locally, where the connection is plain. */
		caPem: string | undefined;
	};
	betterAuth: {
		url: string;
		secret: string;
	};
	cors: {
		origin: string[];
	};
	/** Public origin of this API (`BETTER_AUTH_URL` without a trailing slash). */
	publicUrl: string;
	/** Public origin of the web app, where links in emails and redirects land. */
	appUrl: string;
	composio: {
		apiKey: string;
		/** The auth config (our OAuth app at Composio) per provider. */
		authConfigIds: Record<TIntegrationProvider, string>;
	};
	github: {
		/**
		 * Where to install our GitHub App on an organization, so its connection can list it. Unset
		 * when the environment has no GitHub App.
		 */
		appInstallUrl: string | undefined;
	};
	pubsub: {
		emailsTopic: string;
	};
	api: {
		host: string;
		port: number;
		/** Proxies between the client and the API that append to `X-Forwarded-For`: the load balancer. */
		trustedProxies: number;
	};
	authSignup: TCodeFlowConfig;
	passwordReset: TCodeFlowConfig;
	/** Limits on the unauthenticated auth flows. */
	authRateLimits: {
		perEmail: TRateLimitRule;
		/** High: offices and mobile carriers put many users behind one address. */
		perIp: TRateLimitRule;
	};
};

type TStaticConfigSections = Pick<
	TConfig,
	"authSignup" | "passwordReset" | "authRateLimits"
>;

/** The tuning knobs shared by the real and the test config. */
export function staticConfigSections(): TStaticConfigSections {
	return {
		// Distinct prefixes: a code minted for one flow can never be redeemed by another.
		authSignup: {
			identifierPrefix: "signup-code:",
			codeTtlMs: 15 * 60 * 1000,
			maxAttempts: 5,
		},
		passwordReset: {
			identifierPrefix: "password-reset-code:",
			codeTtlMs: 15 * 60 * 1000,
			maxAttempts: 5,
		},
		authRateLimits: {
			perEmail: { limit: 10, windowMs: 15 * 60 * 1000 },
			perIp: { limit: 50, windowMs: 15 * 60 * 1000 },
		},
	};
}

/** Comma-separated origins, also Better Auth's trustedOrigins: full http(s) origins, no wildcards. */
function parseCorsOrigins(raw: string, context: z.RefinementCtx): string[] {
	const entries = raw
		.split(",")
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
	for (const entry of entries) {
		if (entry.includes("*")) {
			context.addIssue({
				code: "custom",
				message: `"${entry}" is a wildcard; the same list is Better Auth's trusted origins, which take none`,
			});
			continue;
		}
		if (!z.url({ protocol: /^https?$/ }).safeParse(entry).success) {
			context.addIssue({
				code: "custom",
				message: `"${entry}" is not an http(s) origin; use the full origin, comma-separated`,
			});
		}
	}
	return entries;
}

const authConfigIdsSchema = z.object(
	Object.fromEntries(
		INTEGRATION_PROVIDERS.map((provider) => [
			provider,
			z.string().startsWith("ac_", `${provider} needs an ac_ auth config id`),
		]),
	) as Record<TIntegrationProvider, z.ZodString>,
);

/** `github=ac_…,linear=ac_…`: one auth config per provider, every provider present. */
function parseAuthConfigIds(
	raw: string,
	context: z.RefinementCtx,
): Record<TIntegrationProvider, string> {
	const pairs = raw
		.split(",")
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0)
		.map((entry) => entry.split("=").map((part) => part.trim()));
	const parsed = authConfigIdsSchema.safeParse(Object.fromEntries(pairs));
	if (!parsed.success) {
		for (const issue of parsed.error.issues) {
			context.addIssue({
				code: "custom",
				message: `${issue.path.join(".") || "value"}: ${issue.message}; expected provider=ac_… pairs separated by commas`,
			});
		}
		return z.NEVER;
	}
	return parsed.data;
}

/** The code accepted beside the emailed one when emails are not delivered (never in prd). */

const apiEnvSchema = z
	.object({
		APP_ENV: envVar(appEnvSchema),
		...dbEnvSchema.shape,
		BETTER_AUTH_URL: envVar(z.url()),
		BETTER_AUTH_SECRET: envVar(z.string().min(32)),
		CORS_ORIGIN: envVar(z.string().default("").transform(parseCorsOrigins)),
		PUBSUB_EMAILS_TOPIC: envVar(z.string().min(1)),
		APP_URL: envVar(z.url({ protocol: /^https?$/ })),
		COMPOSIO_API_KEY: envVar(z.string().min(1)),
		COMPOSIO_AUTH_CONFIG_IDS: envVar(z.string().transform(parseAuthConfigIds)),
		// The GitHub App's slug, as in github.com/apps/<slug>.
		GITHUB_APP_SLUG: envVar(
			z
				.string()
				.regex(/^[a-z0-9-]+$/)
				.optional(),
		),
		// Google's external load balancer is one hop; it appends the client, then itself. Zero
		// would read the balancer's own address as every client's.
		TRUSTED_PROXIES: envVar(z.coerce.number().int().min(1).default(1)),
		...listenEnvFields,
	})
	.superRefine((env, context) => {
		if (env.APP_ENV !== "local" && env.DB_CA_PEM === undefined) {
			context.addIssue({
				code: "custom",
				message:
					"DB_CA_PEM is required outside APP_ENV=local: the database connection is TLS against its CA",
			});
		}
	});

export function buildConfig(): TConfig {
	const env = parseEnv(apiEnvSchema, process.env);

	return {
		appEnv: env.APP_ENV,
		db: {
			user: env.DB_USER,
			password: env.DB_PASSWORD,
			host: env.DB_HOST,
			port: env.DB_PORT,
			name: env.DB_NAME,
			caPem: env.DB_CA_PEM,
		},
		betterAuth: {
			url: env.BETTER_AUTH_URL,
			secret: env.BETTER_AUTH_SECRET,
		},
		cors: { origin: env.CORS_ORIGIN },
		publicUrl: env.BETTER_AUTH_URL.replace(/\/+$/, ""),
		appUrl: env.APP_URL.replace(/\/+$/, ""),
		composio: {
			apiKey: env.COMPOSIO_API_KEY,
			authConfigIds: env.COMPOSIO_AUTH_CONFIG_IDS,
		},
		github: {
			appInstallUrl: env.GITHUB_APP_SLUG
				? `https://github.com/apps/${env.GITHUB_APP_SLUG}/installations/new`
				: undefined,
		},
		pubsub: { emailsTopic: env.PUBSUB_EMAILS_TOPIC },
		api: {
			host: env.HOST,
			port: env.PORT,
			trustedProxies: env.TRUSTED_PROXIES,
		},
		...staticConfigSections(),
	};
}

let _config: TConfig | null = null;

export function getConfig(): TConfig {
	if (!_config) _config = buildConfig();
	return _config;
}

/** Tests only: pre-register a fixture config. */
export function setConfigForTests(config: TConfig): void {
	_config = config;
}
