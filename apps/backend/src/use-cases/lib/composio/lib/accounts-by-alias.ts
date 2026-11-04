import type { TComposio } from "@/composio";

/** The organization's accounts for a provider whose alias is `alias`, across every page. */
export async function accountsByAlias(
	composio: TComposio,
	query: { organizationId: string; provider: string; alias: string },
): Promise<string[]> {
	const ids: string[] = [];
	let cursor: string | null | undefined;
	do {
		const page = await composio.connectedAccounts.list({
			userIds: [query.organizationId],
			toolkitSlugs: [query.provider],
			cursor,
		});
		for (const account of page.items) {
			if (account.alias === query.alias) ids.push(account.id);
		}
		cursor = page.nextCursor;
	} while (cursor);
	return ids;
}
