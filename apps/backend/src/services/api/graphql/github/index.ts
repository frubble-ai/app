import type { Resolvers } from "@/__generated__/resolvers-types";
import { requireAuth } from "@/services/api/graphql/shared";
import { githubAppInstallUrlUseCase } from "@/use-cases/cases/github-app-install-url.use-case";
import { listGithubOrganizationsUseCase } from "@/use-cases/cases/list-github-organizations.use-case";

/** GitHub's reads: the connected user's organizations, and where to install our GitHub App. */
export function createGithubResolvers(): Resolvers {
	return {
		Query: {
			githubOrganizations: requireAuth(async (_parent, args, context) =>
				listGithubOrganizationsUseCase({
					userId: context.user.id,
					organizationId: args.organizationId,
				}),
			),

			githubAppInstallUrl: requireAuth(async () =>
				githubAppInstallUrlUseCase({}),
			),
		},
	};
}
