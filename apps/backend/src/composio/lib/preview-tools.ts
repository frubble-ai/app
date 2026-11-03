import type { TIntegrationProvider } from "@frubble/db";
import { z } from "zod";

/** One row of a provider's preview: a GitHub organization, a Linear team, a Slack channel. */
export type TIntegrationPreviewItem = { id: string; name: string };

// Pinned, so a Composio release cannot change a tool under us. Bump after checking its changelog.
export const TOOLKIT_VERSIONS: Record<TIntegrationProvider, string> = {
	github: "20261023_00",
	linear: "20260924_00",
	slack: "20261023_00",
};

/** The read each provider's preview runs, and where its list sits in the result. */
export const PREVIEW_TOOLS: Record<
	TIntegrationProvider,
	{ slug: string; arguments: Record<string, unknown>; listKeys: string[] }
> = {
	github: {
		slug: "GITHUB_LIST_ORGANIZATIONS_FOR_THE_AUTHENTICATED_USER",
		arguments: { per_page: 50 },
		listKeys: ["details", "organizations"],
	},
	linear: {
		slug: "LINEAR_LIST_LINEAR_TEAMS",
		arguments: { first: 50 },
		listKeys: ["teams", "nodes"],
	},
	slack: {
		slug: "SLACK_LIST_ALL_CHANNELS",
		arguments: { limit: 100, exclude_archived: true },
		listKeys: ["channels"],
	},
};

const itemSchema = z
	.object({
		id: z.union([z.string(), z.number()]),
		name: z.string().optional(),
		login: z.string().optional(),
	})
	.transform((row) => ({
		id: String(row.id),
		name: row.name ?? row.login ?? String(row.id),
	}));

/** The list in a tool's `data`: under one of `listKeys`, or `data` itself when it is one. */
export function toPreviewItems(
	data: unknown,
	listKeys: string[],
): TIntegrationPreviewItem[] {
	const record = (data ?? {}) as Record<string, unknown>;
	const list = Array.isArray(data)
		? data
		: listKeys.map((key) => record[key]).find(Array.isArray);
	if (!list) return [];
	return list.flatMap((row) => {
		const parsed = itemSchema.safeParse(row);
		return parsed.success ? [parsed.data] : [];
	});
}
