import type { TMessageChannel, TMessagesOn } from "../../catalog/index";
import type { TEnvelope } from "../../envelope/index";
import type { TMessageTransport } from "../../ports/index";

export type TMemoryTransport = {
	transport: TMessageTransport;
	/** Every envelope delivered, in order. */
	delivered: TEnvelope[];
	/** What was delivered on `channel`, without the envelope. */
	sentOn<TChannel extends TMessageChannel>(
		channel: TChannel,
	): TMessagesOn[TChannel][];
	/** The next delivery on `channel` rejects, as the topic would. */
	failNext(channel: TMessageChannel): void;
};

/** A transport that keeps what it is given, for tests. */
export function createMemoryTransport(): TMemoryTransport {
	const delivered: { channel: TMessageChannel; envelope: TEnvelope }[] = [];
	const failing = new Set<TMessageChannel>();
	return {
		transport: {
			deliver: async (channel, envelope) => {
				if (failing.delete(channel)) {
					throw new Error(`memory transport: ${channel} delivery failed`);
				}
				delivered.push({ channel, envelope });
			},
		},
		get delivered() {
			return delivered.map(({ envelope }) => envelope);
		},
		sentOn: <TChannel extends TMessageChannel>(channel: TChannel) =>
			delivered
				.filter((entry) => entry.channel === channel)
				.map(({ envelope }) => {
					const {
						version: _version,
						id: _id,
						occurredAt: _at,
						...message
					} = envelope;
					return message as TMessagesOn[TChannel];
				}),
		failNext: (channel) => {
			failing.add(channel);
		},
	};
}
