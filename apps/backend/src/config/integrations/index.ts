import { INTEGRATION_BROKERS, type TIntegrationBroker } from "@frubble/db";
import { z } from "zod";
import { envVar } from "@/shared/env";
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
	/** The broker new connections go through; existing ones stay on theirs. */
	connectThrough: TIntegrationBroker;
	composio: TComposioConfig;
	osiris: TOsirisConfig;
	github: TGithubConfig;
};

/** Every variable the integrations' config reads. */
export const integrationsEnvFields = {
	...composioEnvFields,
	...osirisEnvFields,
	INTEGRATIONS_CONNECT_THROUGH: envVar(
		z.enum(INTEGRATION_BROKERS).default("composio"),
	),
};

const integrationsEnvSchema = z.object(integrationsEnvFields);

export function integrationsConfig(
	env: z.infer<typeof integrationsEnvSchema>,
): TIntegrationsConfig {
	return {
		connectThrough: env.INTEGRATIONS_CONNECT_THROUGH,
		composio: composioConfig(env),
		osiris: osirisConfig(env),
		github: githubConfig(),
	};
}
