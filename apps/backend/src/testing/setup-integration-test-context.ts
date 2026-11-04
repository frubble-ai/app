import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import type { TConfig } from "@/config";
import {
	bootstrapIntegration,
	cloneForTest,
	type TIntegrationContext,
	type TTestClone,
	teardownIntegration,
} from "./integration-bootstrap";
import { composioNetwork, composioRequests } from "./mock-composio-network";

export type TIntegrationTestHandles = {
	/** The per-test clone. Only inside an `it`: describe-level setup runs before `beforeEach`. */
	getClone: () => TTestClone;
	/** Email to user id, from the seed. */
	getSeedUsers: () => Record<string, string>;
};

/** Registers the before/after hooks for an integration test file. */
export function setupIntegrationTestContext(
	options: { config?: Partial<TConfig> } = {},
): TIntegrationTestHandles {
	let context: TIntegrationContext | undefined;
	let clone: TTestClone | undefined;

	beforeAll(async () => {
		// A request no test answered fails the test instead of reaching Composio.
		composioNetwork.listen({ onUnhandledFrame: "error" });
		context = await bootstrapIntegration();
	}, 180_000);

	afterAll(async () => {
		composioNetwork.close();
		if (context) await teardownIntegration(context);
	});

	beforeEach(async () => {
		if (!context) {
			throw new Error("setupIntegrationTestContext: beforeAll did not run");
		}
		clone = await cloneForTest(context, options);
	});

	afterEach(async () => {
		composioNetwork.resetHandlers();
		composioRequests.length = 0;
		if (clone) {
			await clone.cleanup();
			clone = undefined;
		}
	});

	return {
		getClone: () => {
			if (!clone) {
				throw new Error(
					"setupIntegrationTestContext.getClone(): call it inside an `it` body",
				);
			}
			return clone;
		},
		getSeedUsers: () => {
			if (!context) {
				throw new Error(
					"setupIntegrationTestContext.getSeedUsers(): call it inside an `it` body",
				);
			}
			return context.seedUsers;
		},
	};
}
