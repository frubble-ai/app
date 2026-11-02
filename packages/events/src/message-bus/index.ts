import { DateTime } from "luxon";
import { channelOf, messageSchema } from "../catalog/index";
import { wrapMessage } from "../envelope/index";
import type { TMessageBus, TMessageTransport } from "../ports/index";

/**
 * Checks each message against the catalog, puts it in its envelope and hands it to `transport` on
 * its channel. A message the catalog refuses never leaves.
 */
export function createMessageBus(config: {
	transport: TMessageTransport;
}): TMessageBus {
	const { transport } = config;
	return {
		send: async (message) => {
			const checked = messageSchema.parse(message);
			await transport.deliver(
				channelOf(checked),
				wrapMessage(checked, {
					id: crypto.randomUUID(),
					occurredAt: DateTime.utc().toISO(),
				}),
			);
		},
	};
}
