import type { Resolvers } from "@/__generated__/resolvers-types";
import { requireAuth } from "@/services/api/graphql/shared";
import { githubAppInstallUrlUseCase } from "@/use-cases/cases/github-app-install-url.use-case";
import { listGithubInstallationsUseCase } from "@/use-cases/cases/list-github-installations.use-case";
import { listGithubRepositoriesUseCase } from "@/use-cases/cases/list-github-repositories.use-case";
import { toGqlInstallation } from "./lib/installations";

/** GitHub's reads: where our GitHub App is installed, the repositories it reads, and where to install it. */
export function createGithubResolvers(): Resolvers {
	return {
		Query: {
			githubInstallations: requireAuth(async (_parent, args, context) => {
				const installations = await listGithubInstallationsUseCase({
					userId: context.user.id,
					organizationId: args.organizationId,
				});
				return installations.map(toGqlInstallation);
			}),

			githubRepositories: requireAuth(async (_parent, args, context) =>
				listGithubRepositoriesUseCase({
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
