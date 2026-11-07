import { faker } from "@faker-js/faker";
import {
	integrationBroker,
	integrationConnection,
	type TIntegrationBroker,
	type TIntegrationProvider,
} from "@frubble/db";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { INTEGRATION_ACTION_PROVIDERS } from "@/integrations";
import { generateGithubInstallation } from "@/shared/__mocks__/generate-github-installation";
import { generateGithubRepository } from "@/shared/__mocks__/generate-github-repository";
import { generateSlackChannel } from "@/shared/__mocks__/generate-slack-channel";
import type { TTestClone } from "@/testing/integration-bootstrap";
import { createMockConnectionBroker } from "@/testing/mock-connection-broker";
import { setupIntegrationTestContext } from "@/testing/setup-integration-test-context";
import {
	signedInTestUser,
	type TSignedInTestUser,
} from "@/testing/signed-in-test-user";
import { acceptOrganizationInvitationUseCase } from "@/use-cases/cases/accept-organization-invitation.use-case";
import { completeIntegrationConnectUseCase } from "@/use-cases/cases/complete-integration-connect.use-case";
import { createOrganizationUseCase } from "@/use-cases/cases/create-organization.use-case";
import { disconnectIntegrationUseCase } from "@/use-cases/cases/disconnect-integration.use-case";
import { inviteOrganizationMemberUseCase } from "@/use-cases/cases/invite-organization-member.use-case";
import { listGithubInstallationsUseCase } from "@/use-cases/cases/list-github-installations.use-case";
import { listGithubRepositoriesUseCase } from "@/use-cases/cases/list-github-repositories.use-case";
import { listIntegrationsUseCase } from "@/use-cases/cases/list-integrations.use-case";
import { listLinearTeamsUseCase } from "@/use-cases/cases/list-linear-teams.use-case";
import { listSlackChannelsUseCase } from "@/use-cases/cases/list-slack-channels.use-case";
import { startIntegrationConnectUseCase } from "@/use-cases/cases/start-integration-connect.use-case";

// The use cases on a broker held in memory: each test sets what the broker answers
// (src/testing/mock-connection-broker.ts). Every broker owes the same behaviour
// (src/testing/connection-broker-contract.ts).

const { getClone } = setupIntegrationTestContext();

async function ownerWithOrganization(clone: TTestClone) {
	const owner = await signedInTestUser(clone);
	const { id: organizationId } = await createOrganizationUseCase({
		headers: owner.headers,
		name: faker.company.name(),
	});
	return { owner, organizationId };
}

async function plainMember(
	clone: TTestClone,
	owner: TSignedInTestUser,
	organizationId: string,
) {
	const email = `member+${faker.string.alphanumeric(8).toLowerCase()}@example.com`;
	const invitation = await inviteOrganizationMemberUseCase({
		userId: owner.id,
		inviterName: owner.name,
		headers: owner.headers,
		organizationId,
		email,
		role: "member",
	});
	const joined = await signedInTestUser(clone, email);
	await acceptOrganizationInvitationUseCase({
		headers: joined.headers,
		invitationId: invitation.id,
	});
	return joined;
}

/** Start connecting a provider, GitHub unless named; the callback's connection id and the account. */
async function startConnecting(
	clone: TTestClone,
	args: {
		userId: string;
		organizationId: string;
		provider?: TIntegrationProvider;
	},
) {
	await startIntegrationConnectUseCase({ provider: "github", ...args });
	const connect = clone.broker.lastConnect();
	return {
		connectionId:
			new URL(connect.callbackUrl).searchParams.get("connection") ?? "",
		accountRef: connect.accountRef,
	};
}

async function connected(
	clone: TTestClone,
	args: {
		userId: string;
		organizationId: string;
		provider?: TIntegrationProvider;
	},
) {
	const attempt = await startConnecting(clone, args);
	clone.broker.answerState(attempt.accountRef, "active", { once: true });
	await completeIntegrationConnectUseCase({
		connectionId: attempt.connectionId,
	});
	return attempt;
}

/** A second broker beside the first; new connections go through it from now on. */
async function replaceBroker(clone: TTestClone) {
	// Not one of INTEGRATION_BROKERS; a real replacement adds its key there and its row.
	const key = "replacement" as TIntegrationBroker;
	await clone.db.insert(integrationBroker).values({ key });
	const replacement = createMockConnectionBroker();
	clone.integrations.brokers[key] = replacement.broker;
	clone.integrations.connectThrough = key;
	return replacement;
}

async function rowsOf(clone: TTestClone, organizationId: string) {
	return clone.db
		.select({
			status: integrationConnection.status,
			account: integrationConnection.externalAccountRef,
		})
		.from(integrationConnection)
		.where(eq(integrationConnection.organizationId, organizationId));
}

describe("connecting a provider", () => {
	it("sends the user to the provider's consent, with our callback, on the broker new connections use", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const consentPage = faker.internet.url();
		clone.broker.answerConnect({ redirectUrl: consentPage });

		await expect(
			startIntegrationConnectUseCase({
				userId: owner.id,
				organizationId,
				provider: "github",
			}),
		).resolves.toEqual({ redirectUrl: consentPage });

		const connect = clone.broker.lastConnect();
		expect(connect.callbackUrl).toBe(
			`http://localhost:8080/integrations/callback?connection=${connect.attemptId}`,
		);
		await expect(
			clone.db
				.select({ broker: integrationConnection.broker })
				.from(integrationConnection)
				.where(eq(integrationConnection.id, connect.attemptId)),
		).resolves.toEqual([{ broker: "osiris" }]);
		await expect(
			listIntegrationsUseCase({ userId: owner.id, organizationId }),
		).resolves.toEqual([]);
	});

	it("retires the attempt when the broker gives no page to send the user to", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		clone.broker.answerConnect({ redirectUrl: undefined });

		await expect(
			startIntegrationConnectUseCase({
				userId: owner.id,
				organizationId,
				provider: "github",
			}),
		).rejects.toThrow();

		expect(clone.broker.removedAccounts()).toEqual([
			clone.broker.lastConnect().accountRef,
		]);
		await expect(rowsOf(clone, organizationId)).resolves.toEqual([]);
	});

	it("removes an account the broker made though its answer to the connect was lost", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		clone.broker.loseConnect({ listed: true });

		await expect(
			startIntegrationConnectUseCase({
				userId: owner.id,
				organizationId,
				provider: "github",
			}),
		).rejects.toThrow();

		expect(clone.broker.removedAccounts()).toEqual([
			clone.broker.lastLostAccount(),
		]);
		await expect(rowsOf(clone, organizationId)).resolves.toEqual([]);
	});

	it("keeps looking for a lost answer's account until the broker lists it", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		clone.broker.loseConnect({ listed: false });
		await expect(
			startIntegrationConnectUseCase({
				userId: owner.id,
				organizationId,
				provider: "github",
			}),
		).rejects.toThrow();
		await expect(rowsOf(clone, organizationId)).resolves.toEqual([
			{ status: "retiring", account: null },
		]);

		clone.broker.listLostAccounts();
		await listIntegrationsUseCase({ userId: owner.id, organizationId });

		expect(clone.broker.removedAccounts()).toEqual([
			clone.broker.lastLostAccount(),
		]);
		await expect(rowsOf(clone, organizationId)).resolves.toEqual([]);
	});

	it("stops looking for a lost answer's account after an hour", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		clone.broker.loseConnect({ listed: false });
		await expect(
			startIntegrationConnectUseCase({
				userId: owner.id,
				organizationId,
				provider: "github",
			}),
		).rejects.toThrow();
		await clone.db
			.update(integrationConnection)
			.set({ createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) })
			.where(eq(integrationConnection.organizationId, organizationId));

		await listIntegrationsUseCase({ userId: owner.id, organizationId });

		expect(clone.broker.removedAccounts()).toEqual([]);
		await expect(rowsOf(clone, organizationId)).resolves.toEqual([]);
	});

	it("keeps a connection active when a later answer from the broker says it failed", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const attempt = await startConnecting(clone, {
			userId: owner.id,
			organizationId,
		});
		clone.broker.answerStatesInTurn(attempt.accountRef, ["active", "failed"]);

		await completeIntegrationConnectUseCase({
			connectionId: attempt.connectionId,
		});
		await completeIntegrationConnectUseCase({
			connectionId: attempt.connectionId,
		});

		await expect(rowsOf(clone, organizationId)).resolves.toEqual([
			{ status: "active", account: attempt.accountRef },
		]);
		expect(clone.broker.removedAccounts()).toEqual([]);
	});

	it("asks the broker one settle at a time, whichever answer comes first", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const attempt = await startConnecting(clone, {
			userId: owner.id,
			organizationId,
		});
		const reads = clone.broker.answerStatesInTurn(attempt.accountRef, [
			"failed",
			"active",
		]);

		await Promise.all([
			completeIntegrationConnectUseCase({ connectionId: attempt.connectionId }),
			completeIntegrationConnectUseCase({ connectionId: attempt.connectionId }),
		]);

		// The first answer decided; the second settle found the row already settled and never asked.
		expect(reads.mostAtOnce).toBe(1);
		await expect(rowsOf(clone, organizationId)).resolves.toEqual([]);
		expect(clone.broker.removedAccounts()).toEqual([attempt.accountRef]);
	});

	it("gives up on a broker that hangs and leaves the connection pending", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const attempt = await startConnecting(clone, {
			userId: owner.id,
			organizationId,
		});
		clone.broker.hangState(attempt.accountRef);

		await expect(
			completeIntegrationConnectUseCase({ connectionId: attempt.connectionId }),
		).resolves.toEqual({
			redirectUrl:
				"http://localhost:3000/?integration=github&integration_status=pending",
		});
		await expect(rowsOf(clone, organizationId)).resolves.toEqual([
			{ status: "pending", account: attempt.accountRef },
		]);
	}, 15_000);

	it("activates the connection when the broker says it is live", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const attempt = await startConnecting(clone, {
			userId: owner.id,
			organizationId,
		});
		clone.broker.answerState(attempt.accountRef, "active");

		await expect(
			completeIntegrationConnectUseCase({ connectionId: attempt.connectionId }),
		).resolves.toEqual({
			redirectUrl:
				"http://localhost:3000/?integration=github&integration_status=connected",
		});
		await expect(
			listIntegrationsUseCase({ userId: owner.id, organizationId }),
		).resolves.toEqual([
			{ provider: "github", connectedAt: expect.anything() },
		]);
	});

	it("replaces the previous connection and removes it at the broker", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const args = { userId: owner.id, organizationId };
		const first = await connected(clone, args);

		const second = await connected(clone, args);

		expect(clone.broker.removedAccounts()).toContain(first.accountRef);
		await expect(rowsOf(clone, organizationId)).resolves.toEqual([
			{ status: "active", account: second.accountRef },
		]);
	});

	it("drops a failed attempt at the broker and says it failed", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const attempt = await startConnecting(clone, {
			userId: owner.id,
			organizationId,
		});
		clone.broker.answerState(attempt.accountRef, "failed");

		await expect(
			completeIntegrationConnectUseCase({ connectionId: attempt.connectionId }),
		).resolves.toEqual({
			redirectUrl:
				"http://localhost:3000/?integration=github&integration_status=failed",
		});
		expect(clone.broker.removedAccounts()).toEqual([attempt.accountRef]);
	});

	it("keeps a replaced account until the broker confirms its removal, then retries", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const args = { userId: owner.id, organizationId };
		const first = await connected(clone, args);
		clone.broker.failRemove();

		await connected(clone, args);
		expect(
			(await rowsOf(clone, organizationId)).find(
				(row) => row.status === "retiring",
			),
		).toEqual({ status: "retiring", account: first.accountRef });

		clone.broker.restoreRemove();
		await listIntegrationsUseCase(args);

		expect(
			(await rowsOf(clone, organizationId)).map((row) => row.status),
		).toEqual(["active"]);
	});

	it("shows a connection that went live after its callback once the list is read", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const args = { userId: owner.id, organizationId };
		const attempt = await startConnecting(clone, args);
		clone.broker.answerState(attempt.accountRef, "active");
		clone.broker.answerState(attempt.accountRef, "pending", { once: true });

		await expect(
			completeIntegrationConnectUseCase({ connectionId: attempt.connectionId }),
		).resolves.toEqual({
			redirectUrl:
				"http://localhost:3000/?integration=github&integration_status=pending",
		});
		await expect(listIntegrationsUseCase(args)).resolves.toEqual([
			{ provider: "github", connectedAt: expect.anything() },
		]);
	});

	it("still sends the browser back to the app when the broker cannot be reached", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const attempt = await startConnecting(clone, {
			userId: owner.id,
			organizationId,
		});
		clone.broker.failState(attempt.accountRef);

		await expect(
			completeIntegrationConnectUseCase({ connectionId: attempt.connectionId }),
		).resolves.toEqual({
			redirectUrl:
				"http://localhost:3000/?integration=github&integration_status=pending",
		});
	});

	it("answers a missing, malformed or unknown connection id with a failure", async () => {
		getClone();

		for (const connectionId of [undefined, "nope", faker.string.uuid()]) {
			await expect(
				completeIntegrationConnectUseCase({ connectionId }),
			).resolves.toEqual({
				redirectUrl: "http://localhost:3000/?integration_status=failed",
			});
		}
	});

	it("lets only owners and admins connect, and hides the organization from outsiders", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const joined = await plainMember(clone, owner, organizationId);
		const outsider = await signedInTestUser(clone);

		await expect(
			startIntegrationConnectUseCase({
				userId: joined.id,
				organizationId,
				provider: "slack",
			}),
		).rejects.toMatchObject({ name: "ForbiddenError" });
		await expect(
			startIntegrationConnectUseCase({
				userId: outsider.id,
				organizationId,
				provider: "slack",
			}),
		).rejects.toMatchObject({ name: "NotFoundError" });
		expect(clone.broker.calls()).toEqual([]);
	});

	it("reports connected to both callbacks when two settle the same attempt at once", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const attempt = await startConnecting(clone, {
			userId: owner.id,
			organizationId,
		});
		clone.broker.answerState(attempt.accountRef, "active");
		const connectedUrl =
			"http://localhost:3000/?integration=github&integration_status=connected";

		await expect(
			Promise.all([
				completeIntegrationConnectUseCase({
					connectionId: attempt.connectionId,
				}),
				completeIntegrationConnectUseCase({
					connectionId: attempt.connectionId,
				}),
			]),
		).resolves.toEqual([
			{ redirectUrl: connectedUrl },
			{ redirectUrl: connectedUrl },
		]);
	});
});

describe("reading through a connection", () => {
	it("lists where our GitHub App is installed for any member, through the organization's own account", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const { accountRef } = await connected(clone, {
			userId: owner.id,
			organizationId,
		});
		const joined = await plainMember(clone, owner, organizationId);
		const installations = [generateGithubInstallation()];
		clone.broker.answerAction("github.listInstallations", installations);

		await expect(
			listGithubInstallationsUseCase({ userId: joined.id, organizationId }),
		).resolves.toEqual(installations);
		expect(clone.broker.runs()).toEqual([
			{
				action: "github.listInstallations",
				connection: { organizationId, accountRef },
			},
		]);
	});

	it("lists the GitHub repositories for any member, through the organization's own account", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const { accountRef } = await connected(clone, {
			userId: owner.id,
			organizationId,
		});
		const joined = await plainMember(clone, owner, organizationId);
		const repositories = [generateGithubRepository()];
		clone.broker.answerAction("github.listRepositories", repositories);

		await expect(
			listGithubRepositoriesUseCase({ userId: joined.id, organizationId }),
		).resolves.toEqual(repositories);
		expect(clone.broker.runs()).toEqual([
			{
				action: "github.listRepositories",
				connection: { organizationId, accountRef },
			},
		]);
	});

	it("lists the Slack channels for any member, through the organization's own account", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const { accountRef } = await connected(clone, {
			userId: owner.id,
			organizationId,
			provider: "slack",
		});
		const joined = await plainMember(clone, owner, organizationId);
		const channels = [generateSlackChannel()];
		clone.broker.answerAction("slack.listChannels", channels);

		await expect(
			listSlackChannelsUseCase({ userId: joined.id, organizationId }),
		).resolves.toEqual(channels);
		expect(clone.broker.runs()).toEqual([
			{
				action: "slack.listChannels",
				connection: { organizationId, accountRef },
			},
		]);
	});

	it.each([
		{
			action: "github.listInstallations",
			read: listGithubInstallationsUseCase,
		},
		{
			action: "github.listRepositories",
			read: listGithubRepositoriesUseCase,
		},
		{ action: "linear.listTeams", read: listLinearTeamsUseCase },
		{ action: "slack.listChannels", read: listSlackChannelsUseCase },
	] as const)(
		"hides $action from someone outside the organization, and asks the broker nothing",
		async ({ action, read }) => {
			const clone = getClone();
			const { owner, organizationId } = await ownerWithOrganization(clone);
			await connected(clone, {
				userId: owner.id,
				organizationId,
				provider: INTEGRATION_ACTION_PROVIDERS[action],
			});
			const outsider = await signedInTestUser(clone);

			await expect(
				read({ userId: outsider.id, organizationId }),
			).rejects.toMatchObject({ name: "NotFoundError" });
			expect(clone.broker.runs()).toEqual([]);
		},
	);

	it("says a provider that is not connected is not found", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);

		await expect(
			listLinearTeamsUseCase({ userId: owner.id, organizationId }),
		).rejects.toMatchObject({ name: "NotFoundError" });
		expect(clone.broker.runs()).toEqual([]);
	});
});

describe("disconnecting", () => {
	it("removes the account at the broker and the organization no longer has it", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const args = { userId: owner.id, organizationId };
		const { accountRef } = await connected(clone, args);

		await disconnectIntegrationUseCase({ ...args, provider: "github" });

		expect(clone.broker.removedAccounts()).toEqual([accountRef]);
		await expect(listIntegrationsUseCase(args)).resolves.toEqual([]);
	});

	it("also retires an unfinished attempt, so its callback cannot reconnect", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const args = { userId: owner.id, organizationId };
		await connected(clone, args);
		const attempt = await startConnecting(clone, args);

		await disconnectIntegrationUseCase({ ...args, provider: "github" });

		await expect(
			completeIntegrationConnectUseCase({ connectionId: attempt.connectionId }),
		).resolves.toEqual({
			redirectUrl: "http://localhost:3000/?integration_status=failed",
		});
		await expect(listIntegrationsUseCase(args)).resolves.toEqual([]);
	});

	it("does not report a disconnect the broker has not confirmed, and keeps retrying it", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const args = { userId: owner.id, organizationId };
		await connected(clone, args);
		clone.broker.failRemove();

		await expect(
			disconnectIntegrationUseCase({ ...args, provider: "github" }),
		).rejects.toMatchObject({ name: "InternalServerError" });

		clone.broker.restoreRemove();
		await expect(listIntegrationsUseCase(args)).resolves.toEqual([]);
		await expect(rowsOf(clone, organizationId)).resolves.toEqual([]);
	});

	it("fails a connect that a disconnect overtook while the broker created the account", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const args = { userId: owner.id, organizationId };
		await connected(clone, args);
		clone.broker.answerConnect({
			redirectUrl: faker.internet.url(),
			before: () =>
				disconnectIntegrationUseCase({ ...args, provider: "github" }),
		});

		await expect(
			startIntegrationConnectUseCase({ ...args, provider: "github" }),
		).rejects.toMatchObject({ name: "BadInputError" });

		expect(clone.broker.removedAccounts()).toContain(
			clone.broker.lastConnect().accountRef,
		);
		await expect(rowsOf(clone, organizationId)).resolves.toEqual([]);
	});

	it("keeps the overtaken account on a retiring row when the broker fails to remove it", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const args = { userId: owner.id, organizationId };
		await connected(clone, args);
		clone.broker.answerConnect({
			redirectUrl: faker.internet.url(),
			before: async () => {
				await disconnectIntegrationUseCase({ ...args, provider: "github" });
				clone.broker.failRemove();
			},
		});

		await expect(
			startIntegrationConnectUseCase({ ...args, provider: "github" }),
		).rejects.toMatchObject({ name: "BadInputError" });
		const overtaken = clone.broker.lastConnect().accountRef;
		await expect(rowsOf(clone, organizationId)).resolves.toEqual([
			{ status: "retiring", account: overtaken },
		]);

		clone.broker.restoreRemove();
		await listIntegrationsUseCase(args);

		expect(clone.broker.removedAccounts()).toContain(overtaken);
		await expect(rowsOf(clone, organizationId)).resolves.toEqual([]);
	});
});

describe("replacing a broker", () => {
	it("keeps each connection on the broker it was made through while new ones go through the other", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const args = { userId: owner.id, organizationId };
		const first = await connected(clone, args);
		const replacement = await replaceBroker(clone);
		const repositories = [generateGithubRepository()];
		clone.broker.answerAction("github.listRepositories", repositories);

		await expect(listGithubRepositoriesUseCase(args)).resolves.toEqual(
			repositories,
		);
		expect(replacement.calls()).toEqual([]);

		await startIntegrationConnectUseCase({ ...args, provider: "github" });
		const attempt = replacement.lastConnect();
		replacement.answerState(attempt.accountRef, "active");
		await completeIntegrationConnectUseCase({
			connectionId: attempt.attemptId,
		});

		// The replaced connection was removed where its tokens were.
		expect(clone.broker.removedAccounts()).toEqual([first.accountRef]);
		await expect(rowsOf(clone, organizationId)).resolves.toEqual([
			{ status: "active", account: attempt.accountRef },
		]);
		replacement.answerAction("github.listRepositories", repositories);
		await listGithubRepositoriesUseCase(args);
		expect(replacement.runs()).toEqual([
			{
				action: "github.listRepositories",
				connection: { organizationId, accountRef: attempt.accountRef },
			},
		]);
	});

	it("settles an attempt made before the switch on the broker it was made on", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const attempt = await startConnecting(clone, {
			userId: owner.id,
			organizationId,
		});
		const replacement = await replaceBroker(clone);
		clone.broker.answerState(attempt.accountRef, "active");

		await expect(
			completeIntegrationConnectUseCase({ connectionId: attempt.connectionId }),
		).resolves.toEqual({
			redirectUrl:
				"http://localhost:3000/?integration=github&integration_status=connected",
		});
		expect(replacement.calls()).toEqual([]);
	});
});
