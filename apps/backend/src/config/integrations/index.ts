import { z } from "zod";
import {
	composioConfig,
	composioEnvFields,
	type TComposioConfig,
} from "./composio";
import { githubConfig, type TGithubConfig } from "./github";
import { osirisConfig, osirisEnvFields, type TOsirisConfig } from "./osiris";

// The integrations' config, one module per domain as in the rest of the backend: each broker
// (`composio/`, `osiris/`) and each provider that has its own (`github/`).

export type TIntegrationsConfig = {
	composio: TComposioConfig;
	osiris: TOsirisConfig;
	github: TGithubConfig;
};

/** Every variable the integrations' config reads. */
export const integrationsEnvFields = { ...composioEnvFields, ...osirisEnvFields };

const integrationsEnvSchema = z.object(integrationsEnvFields);

export function integrationsConfig(
	env: z.infer<typeof integrationsEnvSchema>,
): TIntegrationsConfig {
	return {
		composio: composioConfig(env),
		osiris: osirisConfig(env),
		github: githubConfig(),
	};
}
