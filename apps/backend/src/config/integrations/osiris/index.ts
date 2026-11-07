import type { TIntegrationProvider } from "@frubble/db";
import { z } from "zod";
import { parseAuthConfigIds } from "@/config/integrations/lib/auth-config-ids";
import { envVar } from "@/shared/env";

/** The osiris the API's broker talks to (frubble-ai/osiris). */
export type TOsirisConfig = {
	/** Osiris's origin, e.g. `http://localhost:8090`. */
	url: string;
	/** Osiris's API key: connections and actions, never its admin key. */
	apiKey: string;
	/** Our app at osiris (an auth config) per provider. */
	authConfigIds: Record<TIntegrationProvider, string>;
};

/** The variables osiris's config reads. */
export const osirisEnvFields = {
	OSIRIS_URL: envVar(z.url()),
	OSIRIS_API_KEY: envVar(z.string().min(32)),
	OSIRIS_AUTH_CONFIG_IDS: envVar(z.string().transform(parseAuthConfigIds)),
};

export function osirisConfig(env: {
	OSIRIS_URL: string;
	OSIRIS_API_KEY: string;
	OSIRIS_AUTH_CONFIG_IDS: Record<TIntegrationProvider, string>;
}): TOsirisConfig {
	return {
		url: env.OSIRIS_URL.replace(/\/$/, ""),
		apiKey: env.OSIRIS_API_KEY,
		authConfigIds: env.OSIRIS_AUTH_CONFIG_IDS,
	};
}
