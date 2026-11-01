import type { PubSub } from "@google-cloud/pubsub";
import type { TMessageChannel } from "../../catalog/index";
import type { TMessageTransport } from "../../ports/index";

/** Carries each channel's messages on its Pub/Sub topic, as JSON. Rejects when Pub/Sub does. */
export function createPubSubTransport(config: {
	client: PubSub;
	topics: { [TChannel in TMessageChannel]: string };
}): TMessageTransport {
	const { client, topics } = config;
	return {
		deliver: async (channel, envelope) => {
			await client.topic(topics[channel]).publishMessage({ json: envelope });
		},
	};
}
