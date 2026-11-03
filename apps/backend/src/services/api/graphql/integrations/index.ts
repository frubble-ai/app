import { IntegrationTargetSchema } from "@frubble/gql/validation";
import type { Resolvers } from "@/__generated__/resolvers-types";
import { parseSchema } from "@/services/api/graphql/lib/errors";
import { requireAuth } from "@/services/api/graphql/shared";
import { disconnectIntegrationUseCase } from "@/use-cases/cases/disconnect-integration.use-case";
import { listIntegrationsUseCase } from "@/use-cases/cases/list-integrations.use-case";
import { previewIntegrationUseCase } from "@/use-cases/cases/preview-integration.use-case";
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

			integrationPreview: requireAuth(async (_parent, args, context) => {
				const parsed = parseSchema(IntegrationTargetSchema(), args.input);
				return previewIntegrationUseCase({
					userId: context.user.id,
					organizationId: parsed.organizationId,
					provider: fromGqlProvider(parsed.provider),
				});
			}),
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
