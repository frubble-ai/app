import type { Resolvers } from "@/__generated__/resolvers-types";
import { requireAuth } from "@/services/api/graphql/shared";
import { listSlackChannelsUseCase } from "@/use-cases/cases/list-slack-channels.use-case";

/** Slack's read: the channels the connected user can see. */
export function createSlackResolvers(): Resolvers {
	return {
		Query: {
			slackChannels: requireAuth(async (_parent, args, context) =>
				listSlackChannelsUseCase({
					userId: context.user.id,
					organizationId: args.organizationId,
				}),
			),
		},
	};
}
