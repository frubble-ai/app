import type { Resolvers } from "@/__generated__/resolvers-types";
import { requireAuth } from "@/services/api/graphql/shared";
import { listSlackChannelsUseCase } from "@/use-cases/cases/list-slack-channels.use-case";
import { toGqlChannel } from "./lib/channels";

/** Slack's read: the channels the connected user can see. */
export function createSlackResolvers(): Resolvers {
	return {
		Query: {
			slackChannels: requireAuth(async (_parent, args, context) => {
				const channels = await listSlackChannelsUseCase({
					userId: context.user.id,
					organizationId: args.organizationId,
				});
				return channels.map(toGqlChannel);
			}),
		},
	};
}
