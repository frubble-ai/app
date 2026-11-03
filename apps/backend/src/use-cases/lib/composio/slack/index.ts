import type { TComposio } from "@/composio";
import { executeTool } from "@/use-cases/lib/composio/lib/execute-tool";
import type { TSession } from "@/use-cases/lib/composio/lib/session";

/** A Slack channel the connected user can see. */
export type TSlackChannel = {
	id: string;
	name: string;
	isPrivate: boolean;
	memberCount: number | null;
};

/** The workspace's channels the connected user can see, archived ones left out. */
export async function listSlackChannels(
	composio: TComposio,
	session: TSession,
): Promise<TSlackChannel[]> {
	const data = (await executeTool(composio, session, {
		slug: "SLACK_LIST_ALL_CHANNELS",
		arguments: { limit: 200, exclude_archived: true },
	})) as {
		channels: Array<{
			id: string;
			name: string;
			is_private?: boolean;
			num_members?: number;
		}>;
	};
	return data.channels.map((channel) => ({
		id: channel.id,
		name: channel.name,
		isPrivate: channel.is_private ?? false,
		memberCount: channel.num_members ?? null,
	}));
}
