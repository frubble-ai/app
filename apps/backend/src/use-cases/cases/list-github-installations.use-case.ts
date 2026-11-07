import { z } from "zod";
import type { TGithubInstallation } from "@/integrations";
import { defineUseCase } from "@/use-cases";
import { runThroughConnection } from "@/use-cases/lib/integrations/connections";
import { betterAuthIdSchema } from "@/use-cases/lib/organizations/membership";

const listGithubInstallationsArgsSchema = z.object({
	userId: z.string().min(1),
	organizationId: betterAuthIdSchema,
});

/** Where our GitHub App is installed, of what the organization's connected GitHub user can see. Any member may read it. */
export const listGithubInstallationsUseCase = defineUseCase(
	async function listGithubInstallationsUseCase(
		ctx,
		args: { userId: string; organizationId: string },
	): Promise<TGithubInstallation[]> {
		const { userId, organizationId } =
			listGithubInstallationsArgsSchema.parse(args);
		return runThroughConnection(ctx.db, ctx.integrations, {
			userId,
			organizationId,
			action: "github.listInstallations",
			input: {},
		});
	},
);
