import type { TMessage, TMessageChannel } from "../catalog/index";
import type { TEnvelope } from "../envelope/index";

// The ports: what use cases call (`TMessageBus`) and what the bus needs from the outside world to
// do it (`TMessageTransport`). Adapters (Pub/Sub, in memory) implement the second.

/** Hand the worker a message. Resolves once the channel has it; rejects if it cannot. */
export type TMessageBus = {
	send(message: TMessage): Promise<void>;
};

/** Carries an enveloped message on its channel (a topic). */
export type TMessageTransport = {
	deliver(channel: TMessageChannel, envelope: TEnvelope): Promise<void>;
};
