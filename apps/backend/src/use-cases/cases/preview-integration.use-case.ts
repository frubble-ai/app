import type { TIntegrationProvider } from "@frubble/db";
import { z } from "zod";
import type { TIntegrationPreviewItem } from "@/composio";
import { defineUseCase } from "@/use-cases";
import {
	integrationProviderSchema,
	requireActiveConnection,
} from "@/use-cases/lib/integrations/connections";
import {
	betterAuthIdSchema,
	requireMembership,
} from "@/use-cases/lib/organizations/membership";

const previewIntegrationArgsSchema = z.object({
	userId: z.string().min(1),
	organizationId: betterAuthIdSchema,
	provider: integrationProviderSchema,
});

/**
 * A read through the organization's connection that proves it works: its GitHub organizations,
 * Linear teams or Slack channels. Any member may run it.
 */
export const previewIntegrationUseCase = defineUseCase(
	async function previewIntegrationUseCase(
		ctx,
		args: {
			userId: string;
			organizationId: string;
			provider: TIntegrationProvider;
		},
	): Promise<TIntegrationPreviewItem[]> {
		const { userId, organizationId, provider } =
			previewIntegrationArgsSchema.parse(args);
		await requireMembership(ctx, { userId, organizationId });
		const connection = await requireActiveConnection(ctx, {
			organizationId,
			provider,
		});
		return ctx.integrations.preview({
			organizationId,
			provider,
			connectedAccountId: connection.composioConnectedAccountId,
		});
	},
);
