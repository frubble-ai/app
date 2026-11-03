import { integrationConnection } from "@frubble/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { defineUseCase } from "@/use-cases";
import { settleConnection } from "@/use-cases/lib/integrations/connections";

const connectionIdSchema = z.uuid();

const OUTCOMES = {
	active: "connected",
	pending: "pending",
	failed: "failed",
} as const;

/**
 * Where the browser lands after a provider's consent: our connection id in the query, never
 * trusted for anything but finding the row. Composio says whether the account is live; a live one
 * replaces the organization's previous connection to that provider. Always a redirect to the app,
 * even when Composio cannot be reached: the row stays pending and the home page settles it later.
 */
export const completeIntegrationConnectUseCase = defineUseCase(
	async function completeIntegrationConnectUseCase(
		ctx,
		args: { connectionId: string | undefined },
	): Promise<{ redirectUrl: string }> {
		const back = (query: Record<string, string>) => ({
			redirectUrl: `${ctx.config.appUrl}/?${new URLSearchParams(query)}`,
		});

		const id = connectionIdSchema.safeParse(args.connectionId);
		if (!id.success) return back({ integration_status: "failed" });

		const [row] = await ctx.db
			.select()
			.from(integrationConnection)
			.where(eq(integrationConnection.id, id.data))
			.limit(1);
		if (!row) return back({ integration_status: "failed" });

		const state = await settleConnection(ctx, row);
		return back({
			integration: row.provider,
			integration_status: OUTCOMES[state],
		});
	},
);
