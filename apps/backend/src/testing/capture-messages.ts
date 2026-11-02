import type {
	TEmailMessage,
	TMessageBus,
	TMessageChannel,
} from "@frubble/events";
import { createMemoryTransport } from "@frubble/events/memory";
import { createAppMessageBus } from "@/events";

export type TCapturedMessages = {
	/** The API's own message bus, over a transport that keeps what it is given. */
	messages: TMessageBus;
	/** Emails sent so far, in order. */
	readonly emails: TEmailMessage[];
	clear(): void;
	/** The next send on `channel` rejects, as the topic would. */
	failNext(channel: TMessageChannel): void;
};

/** What the API would hand the worker, kept in memory for tests. */
export function createCapturedMessages(): TCapturedMessages {
	let memory = createMemoryTransport();
	const messages: TMessageBus = createAppMessageBus({
		deliver: (channel, envelope) => memory.transport.deliver(channel, envelope),
	});
	return {
		messages,
		get emails() {
			return memory.sentOn("emails");
		},
		clear: () => {
			memory = createMemoryTransport();
		},
		failNext: (channel) => memory.failNext(channel),
	};
}
