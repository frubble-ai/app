import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import type {
	TAccountState,
	TConnectionBroker,
	TGithubOrganization,
} from "@/integrations";
import { generateConnectAttempt } from "@/shared/__mocks__/generate-connect-attempt";
import { generateGithubOrganization } from "@/shared/__mocks__/generate-github-organization";

/**
 * What a contract run needs from one broker: the broker, and a way to make it answer as the
 * provider and the broker would. Each implementation arranges its own (its network, or memory).
 */
export type TBrokerHarness = {
	broker: TConnectionBroker;
	/** The next connect opens `redirectUrl`; the account it makes, once known (after the call). */
	answerConnect(redirectUrl: string): { accountRef: () => string };
	/** The account's consent ended as `state`. */
	answerState(accountRef: string, state: TAccountState): void;
	/** Reads of the account never answer. */
	hangState(accountRef: string): void;
	/** The next connect's answer is lost after the broker made and listed its account. */
	loseConnect(): { accountRef: () => string };
	/** The account was removed already, elsewhere. */
	removedElsewhere(accountRef: string): void;
	/** The GitHub user of every connection belongs to `organizations`. */
	answerGithubOrganizations(organizations: TGithubOrganization[]): void;
};

/** The behaviour every broker owes the use cases, run against one of them. */
export function describeConnectionBrokerContract(
	name: string,
	harness: () => TBrokerHarness,
) {
	describe(`${name} as a connection broker`, () => {
		it("opens the provider's consent and names the account it made", async () => {
			const { broker, answerConnect } = harness();
			const redirectUrl = faker.internet.url();
			const made = answerConnect(redirectUrl);

			const connect = await broker.startConnect(generateConnectAttempt());

			expect(connect).toEqual({ accountRef: made.accountRef(), redirectUrl });
		});

		it.each<TAccountState>(["pending", "active", "failed"])(
			"reads an account whose consent is %s",
			async (state) => {
				const { broker, answerConnect, answerState } = harness();
				answerConnect(faker.internet.url());
				const { accountRef } = await broker.startConnect(
					generateConnectAttempt(),
				);
				answerState(accountRef, state);

				await expect(broker.accountState(accountRef)).resolves.toBe(state);
			},
		);

		it("stops waiting for an account's state when the caller gives up", async () => {
			const { broker, answerConnect, hangState } = harness();
			answerConnect(faker.internet.url());
			const { accountRef } = await broker.startConnect(
				generateConnectAttempt(),
			);
			hangState(accountRef);

			await expect(
				broker.accountState(accountRef, { signal: AbortSignal.timeout(50) }),
			).rejects.toThrow();
		});

		it("counts removing an account that is already gone as removed", async () => {
			const { broker, answerConnect, removedElsewhere } = harness();
			answerConnect(faker.internet.url());
			const { accountRef } = await broker.startConnect(
				generateConnectAttempt(),
			);
			removedElsewhere(accountRef);

			await expect(broker.removeAccount(accountRef)).resolves.toBeUndefined();
		});

		it("finds the account made for an attempt whose answer was lost, and no other", async () => {
			const { broker, loseConnect } = harness();
			const attempt = generateConnectAttempt();
			const made = loseConnect();
			await expect(broker.startConnect(attempt)).rejects.toThrow();

			await expect(broker.findAccountsByAttempt(attempt)).resolves.toEqual([
				made.accountRef(),
			]);
			await expect(
				broker.findAccountsByAttempt({
					...attempt,
					attemptId: faker.string.uuid(),
				}),
			).resolves.toEqual([]);
		});

		it("lists the GitHub organizations through the connection", async () => {
			const { broker, answerConnect, answerState, answerGithubOrganizations } =
				harness();
			const attempt = generateConnectAttempt();
			answerConnect(faker.internet.url());
			const { accountRef } = await broker.startConnect(attempt);
			answerState(accountRef, "active");
			const organizations = [generateGithubOrganization()];
			answerGithubOrganizations(organizations);

			await expect(
				broker.run(
					"github.listOrganizations",
					{ organizationId: attempt.organizationId, accountRef },
					{},
				),
			).resolves.toEqual(organizations);
		});
	});
}
