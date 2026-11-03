import type { TComposio } from "@/composio";

/** Whose tokens a tool runs with: the organization (Composio's user) and its connected account. */
export type TConnectedAccountRef = {
	organizationId: string;
	connectedAccountId: string;
};

/** Run a read-only tool at its pinned version; Composio's failure becomes a thrown error. */
export async function executeRead(
	composio: TComposio,
	account: TConnectedAccountRef,
	tool: { slug: string; version: string; arguments: Record<string, unknown> },
): Promise<unknown> {
	const result = await composio.tools.execute(tool.slug, {
		userId: account.organizationId,
		connectedAccountId: account.connectedAccountId,
		version: tool.version,
		arguments: tool.arguments,
	});
	if (!result.successful) {
		throw new Error(`${tool.slug} failed: ${result.error ?? "no error"}`);
	}
	return result.data;
}
