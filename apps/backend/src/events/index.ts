import {
	createMessageBus,
	type TMessageBus,
	type TMessageTransport,
} from "@frubble/events";

/** The API's message bus over `transport`. */
export function createAppMessageBus(transport: TMessageTransport): TMessageBus {
	return createMessageBus({ transport });
}
