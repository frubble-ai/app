import type { TComposio } from "@/composio";
import { type TSchemaPatch, toolOutputSchema } from "./output-schema";
import type { TSession } from "./session";

/**
 * Run one tool through the session and check its `data` against the tool's own output schema. A
 * failed run or a response that doesn't match throws: nothing unchecked leaves this function.
 */
export async function executeTool(
	composio: TComposio,
	session: TSession,
	tool: {
		slug: string;
		arguments: Record<string, unknown>;
		patch?: TSchemaPatch;
	},
): Promise<unknown> {
	const result = await session.execute(tool.slug, tool.arguments);
	if (result.resultType !== "completed") {
		throw new Error(
			`${tool.slug} ${result.resultType}: ${result.error ?? "no error"} (log ${result.logId})`,
		);
	}
	const schema = await toolOutputSchema(composio, tool.slug, tool.patch);
	const parsed = schema.safeParse(result.data);
	if (!parsed.success) {
		throw new Error(
			`${tool.slug} returned data its output schema refuses (log ${result.logId}): ${parsed.error.message}`,
		);
	}
	return parsed.data;
}
