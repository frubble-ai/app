import type { Resolvers } from "@/__generated__/resolvers-types";
import { requireAuth } from "@/services/api/graphql/shared";
import { listLinearTeamsUseCase } from "@/use-cases/cases/list-linear-teams.use-case";

/** Linear's read: the teams the connected user can see. */
export function createLinearResolvers(): Resolvers {
	return {
		Query: {
			linearTeams: requireAuth(async (_parent, args, context) =>
				listLinearTeamsUseCase({
					userId: context.user.id,
					organizationId: args.organizationId,
				}),
			),
		},
	};
}
