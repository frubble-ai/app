import { integrationConnection } from "@frubble/db";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { defineUseCase } from "@/use-cases";
import { removeConnectedAccounts } from "@/use-cases/lib/integrations/connections";

const connectionIdSchema = z.uuid();

/**
 * Where the browser lands after a provider's consent: our connection id in the query, never
 * trusted for anything but finding the row. Composio says whether the account is live; a live one
 * replaces the organization's previous connection to that provider.
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
		const result = (status: string) =>
			back({ integration: row.provider, integration_status: status });
		if (row.status === "active") return result("connected");

		const state = await ctx.integrations.getState(
			row.composioConnectedAccountId,
		);
		if (state === "pending") return result("pending");
		if (state === "failed") {
			await ctx.db
				.delete(integrationConnection)
				.where(eq(integrationConnection.id, row.id));
			await removeConnectedAccounts(ctx, [row.composioConnectedAccountId]);
			return result("failed");
		}

		const replaced = await ctx.db.transaction(async (tx) => {
			const previous = await tx
				.delete(integrationConnection)
				.where(
					and(
						eq(integrationConnection.organizationId, row.organizationId),
						eq(integrationConnection.provider, row.provider),
						ne(integrationConnection.id, row.id),
					),
				)
				.returning({
					connectedAccountId: integrationConnection.composioConnectedAccountId,
				});
			await tx
				.update(integrationConnection)
				.set({ status: "active" })
				.where(eq(integrationConnection.id, row.id));
			return previous.map((entry) => entry.connectedAccountId);
		});
		await removeConnectedAccounts(ctx, replaced);
		return result("connected");
	},
);
