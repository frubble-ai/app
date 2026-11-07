import type { TIntegrationProvider } from "@frubble/db";
import { z } from "zod";
import { parseAuthConfigIds } from "@/config/integrations/lib/auth-config-ids";
import { envVar } from "@/shared/env";

/** The Composio project the API's broker talks to. */
export type TComposioConfig = {
	apiKey: string;
	/** The auth config (our app at Composio) per provider. */
	authConfigIds: Record<TIntegrationProvider, string>;
	/**
	 * The most pages one provider list reads through Composio's proxy. A list longer than this
	 * many pages answers with its first pages only.
	 */
	proxyMaxPages: number;
};

/** The variables Composio's config reads. */
export const composioEnvFields = {
	COMPOSIO_API_KEY: envVar(z.string().min(1)),
	COMPOSIO_AUTH_CONFIG_IDS: envVar(z.string().transform(parseAuthConfigIds)),
};

export function composioConfig(env: {
	COMPOSIO_API_KEY: string;
	COMPOSIO_AUTH_CONFIG_IDS: Record<TIntegrationProvider, string>;
}): TComposioConfig {
	return {
		apiKey: env.COMPOSIO_API_KEY,
		authConfigIds: env.COMPOSIO_AUTH_CONFIG_IDS,
		proxyMaxPages: 10,
	};
}
