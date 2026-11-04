import type { TComposio } from "@/composio/lib/client";
import { executeTool } from "@/composio/lib/execute-tool";
import type { TSession } from "@/composio/lib/session";
import type { TSlackChannel } from "@/integrations";

/** The workspace's channels the connected user can see, archived ones left out. */
export async function listSlackChannels(
	composio: TComposio,
	session: TSession,
): Promise<TSlackChannel[]> {
	const data = await executeTool(composio, session, {
		slug: "SLACK_LIST_ALL_CHANNELS",
		arguments: { limit: 200, exclude_archived: true },
	});
	// Composio's schema makes the list and a channel's name optional: none is no channels, and a
	// channel without a name shows its id.
	return (data.channels ?? []).map((channel) => ({
		id: channel.id,
		name: channel.name ?? channel.id,
		isPrivate: channel.is_private ?? false,
		memberCount: channel.num_members ?? null,
	}));
}
