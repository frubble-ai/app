import type { TComposioToolData } from "@/__generated__/composio";
import type { TComposio } from "@/composio/lib/client";
import { type TSchemaPatch, toolOutputSchema } from "./output-schema";
import type { TSession } from "./session";

/**
 * Run one tool through the session and check its `data` against the tool's own output schema. A
 * failed run or a response that doesn't match throws: nothing unchecked leaves this function. Its
 * type is the tool's `data`, generated from the same schema (codegen/composio-tools.ts).
 */
export async function executeTool<TSlug extends keyof TComposioToolData>(
	composio: TComposio,
	session: TSession,
	tool: {
		slug: TSlug;
		arguments: Record<string, unknown>;
		patch?: TSchemaPatch;
	},
): Promise<TComposioToolData[TSlug]> {
	const result = await session.execute(tool.slug, tool.arguments);
	if (result.resultType !== "completed") {
		throw new Error(
			`${tool.slug} ${result.resultType}: ${result.error ?? "no error"} (log ${result.logId})`,
		);
	}
	let parsed = (
		await toolOutputSchema(composio, tool.slug, tool.patch)
	).safeParse(result.data);
	if (!parsed.success) {
		// The session may run a newer toolkit version than the schema we kept: check once more
		// against Composio's current one before refusing.
		parsed = (
			await toolOutputSchema(composio, tool.slug, tool.patch, { refresh: true })
		).safeParse(result.data);
	}
	if (!parsed.success) {
		throw new Error(
			`${tool.slug} returned data its output schema refuses (log ${result.logId}): ${parsed.error.message}`,
		);
	}
	// Checked against the same schema, with the same patch, the type was generated from.
	return parsed.data as TComposioToolData[TSlug];
}
