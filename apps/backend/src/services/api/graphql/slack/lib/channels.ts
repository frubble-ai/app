import type { TSlackChannel } from "@/integrations";

/** A channel in the schema's terms. */
export function toGqlChannel(channel: TSlackChannel) {
	return {
		id: channel.id,
		name: channel.name,
		isPrivate: channel.is_private,
		memberCount: channel.num_members ?? null,
	};
}
