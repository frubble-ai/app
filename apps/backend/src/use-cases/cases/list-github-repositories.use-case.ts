import { z } from "zod";
import type { TGithubRepository } from "@/integrations";
import { defineUseCase } from "@/use-cases";
import { runThroughConnection } from "@/use-cases/lib/integrations/connections";
import { betterAuthIdSchema } from "@/use-cases/lib/organizations/membership";

const listGithubRepositoriesArgsSchema = z.object({
	userId: z.string().min(1),
	organizationId: betterAuthIdSchema,
});

/** The repositories our GitHub App's installations give the organization's connected GitHub user. Any member may read them. */
export const listGithubRepositoriesUseCase = defineUseCase(
	async function listGithubRepositoriesUseCase(
		ctx,
		args: { userId: string; organizationId: string },
	): Promise<TGithubRepository[]> {
		const { userId, organizationId } =
			listGithubRepositoriesArgsSchema.parse(args);
		return runThroughConnection(ctx.db, ctx.integrations, {
			userId,
			organizationId,
			action: "github.listRepositories",
			input: {},
		});
	},
);
