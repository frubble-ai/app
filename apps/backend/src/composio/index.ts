import { Composio } from "@composio/core";

/** The configured Composio client. Setup only: use cases make every call through `ctx.composio`. */
export type TComposio = Composio;

/** No telemetry and no npm version check: the client only talks to Composio's API. */
export function createComposio(apiKey: string): TComposio {
	return new Composio({
		apiKey,
		allowTracking: false,
		disableVersionCheck: true,
	});
}
