import { slackListChannels } from "@frubble-ai/osiris-client";
import type { TSlackChannel } from "@/integrations";
import { answer } from "@/osiris/lib/answer";
import type { TOsiris } from "@/osiris/lib/client";

/** `slack.list_channels`, in our types. */
export async function listSlackChannels(
	osiris: TOsiris,
	accountRef: string,
): Promise<TSlackChannel[]> {
	const { data } = answer(
		await slackListChannels({ client: osiris, path: { id: accountRef } }),
	);
	return data.map((channel) => ({
		id: channel.id,
		name: channel.name,
		isPrivate: channel.is_private,
		memberCount: channel.num_members ?? null,
	}));
}
