import { z } from "zod";

/** One row of a provider's preview: a GitHub organization, a Linear team, a Slack channel. */
export type TIntegrationPreviewItem = { id: string; name: string };

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
