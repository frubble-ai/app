import { INTEGRATION_BROKERS, type TIntegrationBroker } from "@frubble/db";
import type { TIntegrations } from "@/integrations";
import {
	createMockConnectionBroker,
	type TMockConnectionBroker,
} from "./mock-connection-broker";

/**
 * Every broker held in memory, new connections through `connectThrough` as the config says, on
 * `broker`, which the test sets the answers of.
 */
export function mockIntegrations(
	connectThrough: TIntegrationBroker,
	broker: TMockConnectionBroker = createMockConnectionBroker(),
): TIntegrations {
	const brokers = Object.fromEntries(
		INTEGRATION_BROKERS.map((key) => [
			key,
			key === connectThrough
				? broker.broker
				: createMockConnectionBroker().broker,
		]),
	) as TIntegrations["brokers"];
	return { brokers, connectThrough };
}
