import { z } from "zod";
import {
	composioConfig,
	composioEnvFields,
	type TComposioConfig,
} from "./composio";
import { githubConfig, type TGithubConfig } from "./github";

// The integrations' config, one module per domain as in the rest of the backend: the broker
// (`composio/`) and each provider that has its own (`github/`).

export type TIntegrationsConfig = {
	composio: TComposioConfig;
	github: TGithubConfig;
};

/** Every variable the integrations' config reads. */
export const integrationsEnvFields = { ...composioEnvFields };

const integrationsEnvSchema = z.object(integrationsEnvFields);

export function integrationsConfig(
	env: z.infer<typeof integrationsEnvSchema>,
): TIntegrationsConfig {
	return { composio: composioConfig(env), github: githubConfig() };
}
