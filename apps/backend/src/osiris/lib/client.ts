import { createOsirisClient } from "@frubble-ai/osiris-client";
import type { TOsirisConfig } from "@/config/integrations/osiris";

/** The configured osiris client; only this folder calls it. */
export type TOsiris = ReturnType<typeof createOsirisClient>;

export function createOsiris(config: TOsirisConfig): TOsiris {
	return createOsirisClient({ baseUrl: config.url, apiKey: config.apiKey });
}
