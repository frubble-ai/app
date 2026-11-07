import { z } from "zod";
import type { TSlackChannel } from "@/integrations";
import { defineUseCase } from "@/use-cases";
import { runThroughConnection } from "@/use-cases/lib/integrations/connections";
import { betterAuthIdSchema } from "@/use-cases/lib/organizations/membership";

const listSlackChannelsArgsSchema = z.object({
	userId: z.string().min(1),
	organizationId: betterAuthIdSchema,
});

/** The workspace's channels the connected user can see, through the organization's connection. Any member may read them. */
export const listSlackChannelsUseCase = defineUseCase(
	async function listSlackChannelsUseCase(
		ctx,
		args: { userId: string; organizationId: string },
	): Promise<TSlackChannel[]> {
		const { userId, organizationId } = listSlackChannelsArgsSchema.parse(args);
		return runThroughConnection(ctx.db, ctx.integrations, {
			userId,
			organizationId,
			action: "slack.listChannels",
			input: {},
		});
	},
);
