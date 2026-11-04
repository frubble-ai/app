import { INTEGRATION_PROVIDERS, type TIntegrationProvider } from "@frubble/db";
import { z } from "zod";
import { envVar } from "@/shared/env";

/** The Composio project the API's broker talks to. */
export type TComposioConfig = {
	apiKey: string;
	/** The auth config (our app at Composio) per provider. */
	authConfigIds: Record<TIntegrationProvider, string>;
};

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
	};
}
