import { Composio } from "@composio/core";

/** The configured Composio client. Setup only: use cases make every call through `ctx.composio`. */
export type TComposio = Composio;

export function createComposio(apiKey: string): TComposio {
	return new Composio({ apiKey });
}
