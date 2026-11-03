import { z } from "zod";
import { defineUseCase } from "@/use-cases";
import {
	listGithubOrganizations,
	openSession,
	type TGithubOrganization,
} from "@/use-cases/lib/composio";
import { requireActiveConnection } from "@/use-cases/lib/integrations/connections";
import {
	betterAuthIdSchema,
	requireMembership,
} from "@/use-cases/lib/organizations/membership";

const listGithubOrganizationsArgsSchema = z.object({
	userId: z.string().min(1),
	organizationId: betterAuthIdSchema,
});

/** The organizations the connected GitHub user belongs to, through the organization's connection. Any member may read them. */
export const listGithubOrganizationsUseCase = defineUseCase(
	async function listGithubOrganizationsUseCase(
		ctx,
		args: { userId: string; organizationId: string },
	): Promise<TGithubOrganization[]> {
		const { userId, organizationId } =
			listGithubOrganizationsArgsSchema.parse(args);
		await requireMembership(ctx.db, { userId, organizationId });
		const connection = await requireActiveConnection(ctx.db, {
			organizationId,
			provider: "github",
		});
		const session = await openSession(ctx.composio, {
			organizationId,
			toolkit: "github",
			authConfigId: ctx.config.composio.authConfigIds.github,
			connectedAccountId: connection.composioConnectedAccountId,
		});
		return listGithubOrganizations(ctx.composio, session);
	},
);
