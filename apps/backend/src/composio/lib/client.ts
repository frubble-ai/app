import { Composio } from "@composio/core";

/** The configured Composio client; only this folder calls it. */
export type TComposio = Composio;

/** No telemetry and no npm version check: the client only talks to Composio's API. */
export function createComposio(apiKey: string): TComposio {
	return new Composio({
		apiKey,
		allowTracking: false,
		disableVersionCheck: true,
	});
}
