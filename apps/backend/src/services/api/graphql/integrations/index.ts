import { IntegrationTargetSchema } from "@frubble/gql/validation";
import type { Resolvers } from "@/__generated__/resolvers-types";
import { parseSchema } from "@/services/api/graphql/lib/errors";
import { requireAuth } from "@/services/api/graphql/shared";
import { disconnectIntegrationUseCase } from "@/use-cases/cases/disconnect-integration.use-case";
import { listGithubOrganizationsUseCase } from "@/use-cases/cases/list-github-organizations.use-case";
import { listIntegrationsUseCase } from "@/use-cases/cases/list-integrations.use-case";
import { listLinearTeamsUseCase } from "@/use-cases/cases/list-linear-teams.use-case";
import { listSlackChannelsUseCase } from "@/use-cases/cases/list-slack-channels.use-case";
import { startIntegrationConnectUseCase } from "@/use-cases/cases/start-integration-connect.use-case";
import { fromGqlProvider, toGqlProvider } from "./lib/providers";

export function createIntegrationResolvers(): Resolvers {
	return {
		Query: {
			integrations: requireAuth(async (_parent, args, context) => {
				const connected = await listIntegrationsUseCase({
					userId: context.user.id,
					organizationId: args.organizationId,
				});
				return connected.map((entry) => ({
					provider: toGqlProvider(entry.provider),
					connectedAt: entry.connectedAt.toISO() ?? "",
				}));
			}),

			githubOrganizations: requireAuth(async (_parent, args, context) =>
				listGithubOrganizationsUseCase({
					userId: context.user.id,
					organizationId: args.organizationId,
				}),
			),

			linearTeams: requireAuth(async (_parent, args, context) =>
				listLinearTeamsUseCase({
					userId: context.user.id,
					organizationId: args.organizationId,
				}),
			),

			slackChannels: requireAuth(async (_parent, args, context) =>
				listSlackChannelsUseCase({
					userId: context.user.id,
					organizationId: args.organizationId,
				}),
			),
		},
		Mutation: {
			startIntegrationConnect: requireAuth(async (_parent, args, context) => {
				const parsed = parseSchema(IntegrationTargetSchema(), args.input);
				return startIntegrationConnectUseCase({
					userId: context.user.id,
					organizationId: parsed.organizationId,
					provider: fromGqlProvider(parsed.provider),
				});
			}),

			disconnectIntegration: requireAuth(async (_parent, args, context) => {
				const parsed = parseSchema(IntegrationTargetSchema(), args.input);
				await disconnectIntegrationUseCase({
					userId: context.user.id,
					organizationId: parsed.organizationId,
					provider: fromGqlProvider(parsed.provider),
				});
				return { disconnected: true };
			}),
		},
	};
}
