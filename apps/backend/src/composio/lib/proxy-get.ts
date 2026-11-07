import type { z } from "zod";
import type { TRunContext } from "./run-context";

/**
 * `GET` one of the provider's own endpoints through Composio's proxy, with the connection's token,
 * for an endpoint no current Composio tool covers. The answer is checked against `schema`, ours,
 * from the provider's documented response: nothing unchecked leaves this function.
 */
export async function proxyGet<TSchema extends z.ZodType>(
	run: TRunContext,
	request: {
		endpoint: string;
		query?: Record<string, string | number>;
		schema: TSchema;
	},
): Promise<z.infer<TSchema>> {
	const response = await run.composio.tools.proxyExecute({
		endpoint: request.endpoint,
		method: "GET",
		connectedAccountId: run.connectedAccountId,
		// The project requires the account's owner beside the account.
		userId: run.organizationId,
		parameters: Object.entries(request.query ?? {}).map(([name, value]) => ({
			in: "query" as const,
			name,
			value,
		})),
	});
	if (response.status !== 200) {
		throw new Error(`GET ${request.endpoint} answered ${response.status}`);
	}
	const parsed = request.schema.safeParse(response.data);
	if (!parsed.success) {
		throw new Error(
			`GET ${request.endpoint} returned data its schema refuses: ${parsed.error.message}`,
		);
	}
	return parsed.data;
}
