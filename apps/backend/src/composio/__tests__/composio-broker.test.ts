import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { createComposioBroker } from "@/composio";
import {
	generateComposioConnectedAccountId,
	generateComposioConnection,
} from "@/composio/__mocks__/generate-composio-connection";
import { generateComposioLinearTeam } from "@/composio/__mocks__/generate-composio-linear-team";
import { generateComposioSlackChannel } from "@/composio/__mocks__/generate-composio-slack-channel";
import { generateGithubApiInstallation } from "@/composio/__mocks__/generate-github-api-installation";
import { generateGithubApiRepository } from "@/composio/__mocks__/generate-github-api-repository";
import { generateLinearTeamsTool } from "@/composio/__mocks__/generate-linear-teams-tool";
import { generateSlackChannelsTool } from "@/composio/__mocks__/generate-slack-channels-tool";
import {
	answerAccountGone,
	answerAccountMadeForLastAttempt,
	answerAccountPages,
	answerConnectedAccount,
	answerExecute,
	answerInitiate,
	answerProxy,
	answerTool,
	composioRequests,
	failDelete,
	failInitiate,
	hangConnectedAccount,
	lastInitiateRequest,
	proxyRequests,
	setupComposioNetwork,
} from "@/composio/__mocks__/mock-composio-network";
import { generateConnectAttempt } from "@/shared/__mocks__/generate-connect-attempt";
import { describeConnectionBrokerContract } from "@/testing/connection-broker-contract";
import { buildTestConfig } from "@/testing/test-environment";

// The real SDK and the real broker; only Composio's HTTP answers are the test's.
setupComposioNetwork();

const STATUSES = {
	pending: "INITIATED",
	active: "ACTIVE",
	failed: "FAILED",
} as const;

const LIST_CHANNELS = "SLACK_LIST_ALL_CHANNELS";

function composioBroker() {
	return createComposioBroker(buildTestConfig().integrations.composio);
}

describeConnectionBrokerContract("Composio", () => ({
	broker: composioBroker(),
	answerConnect(redirectUrl) {
		const connectedAccountId = generateComposioConnectedAccountId();
		answerInitiate({ connectedAccountId, redirectUrl });
		return { accountRef: () => connectedAccountId };
	},
	answerState: (accountRef, state) =>
		answerConnectedAccount(accountRef, STATUSES[state]),
	hangState: (accountRef) => hangConnectedAccount(accountRef),
	loseConnect() {
		const connectedAccountId = generateComposioConnectedAccountId();
		failInitiate();
		answerAccountMadeForLastAttempt(connectedAccountId);
		return { accountRef: () => connectedAccountId };
	},
	removedElsewhere: (accountRef) => answerAccountGone(accountRef),
	answerGithub({ installations, repositories }) {
		answerProxy("/user/installations", {
			page: () => ({
				total_count: installations.length,
				installations: installations.map((installation) => ({
					...generateGithubApiInstallation({
						id: Number(installation.id),
						login: installation.account,
						type:
							installation.account_type === "user" ? "User" : "Organization",
						repository_selection: installation.repository_selection,
					}),
				})),
			}),
		});
		for (const installation of installations) {
			answerProxy(`/user/installations/${installation.id}/repositories`, {
				page: () => ({
					total_count: repositories.length,
					repositories: repositories.map((repository) => ({
						...generateGithubApiRepository(),
						id: Number(repository.id),
						full_name: repository.full_name,
						private: repository.private,
						html_url: repository.url,
						description: repository.description,
					})),
				}),
			});
		}
	},
}));

describe("connecting through Composio", () => {
	it("opens the provider's own consent on our auth config, marked with the attempt, with our callback", async () => {
		const attempt = generateConnectAttempt();
		answerInitiate({
			connectedAccountId: generateComposioConnectedAccountId(),
			redirectUrl: faker.internet.url(),
		});

		await composioBroker().startConnect(attempt);

		const initiated = lastInitiateRequest();
		expect(initiated?.auth_config?.id).toBe(
			buildTestConfig().integrations.composio.authConfigIds.github,
		);
		expect(initiated?.connection).toMatchObject({
			user_id: attempt.organizationId,
			alias: attempt.attemptId,
			callback_url: attempt.callbackUrl,
			state: {
				authScheme: "OAUTH2",
				val: { status: "INITIALIZING", long_redirect_url: true },
			},
		});
	});

	it("gives no page when Composio has none to send the user to", async () => {
		const connectedAccountId = generateComposioConnectedAccountId();
		answerInitiate({ connectedAccountId, redirectUrl: null });

		await expect(
			composioBroker().startConnect(generateConnectAttempt()),
		).resolves.toEqual({
			accountRef: connectedAccountId,
			redirectUrl: undefined,
		});
	});

	it("finds a lost answer's account on a later page of Composio's listing", async () => {
		const attempt = generateConnectAttempt();
		const lost = generateComposioConnectedAccountId();
		failInitiate();
		answerAccountPages([
			[{ id: generateComposioConnectedAccountId() }],
			[{ id: lost, madeForLastAttempt: true }],
		]);
		const broker = composioBroker();
		await expect(broker.startConnect(attempt)).rejects.toThrow();

		await expect(broker.findAccountsByAttempt(attempt)).resolves.toEqual([
			lost,
		]);
	});

	it("fails a removal Composio does not confirm", async () => {
		failDelete();

		await expect(
			composioBroker().removeAccount(generateComposioConnectedAccountId()),
		).rejects.toThrow();
	});
});

describe("running an action through Composio", () => {
	// Each action: what Composio answers for it, and what the broker must read that into.
	const ACTION_CASES = [
		{
			action: "linear.listTeams",
			toolkit: "linear",
			answer() {
				const team = generateComposioLinearTeam();
				answerTool(generateLinearTeamsTool());
				answerExecute("LINEAR_LIST_LINEAR_TEAMS", {
					data: { items: [], teams: [team] },
				});
				return [{ id: team.id, name: team.name }];
			},
		},
		{
			action: "slack.listChannels",
			toolkit: "slack",
			answer() {
				const channel = generateComposioSlackChannel();
				answerTool(generateSlackChannelsTool());
				answerExecute("SLACK_LIST_ALL_CHANNELS", {
					data: { channels: [channel] },
				});
				return [
					{
						id: channel.id,
						name: channel.name,
						is_private: channel.is_private,
						num_members: channel.num_members,
					},
				];
			},
		},
	] as const;

	it.each(ACTION_CASES)(
		"runs $action in a $toolkit session on the organization's own account, read into our output",
		async ({ action, toolkit, answer }) => {
			const through = generateComposioConnection();
			const expected = answer();

			await expect(composioBroker().run(action, through, {})).resolves.toEqual(
				expected,
			);
			expect(
				composioRequests.findLast((entry) =>
					entry.path.endsWith("/tool_router/session"),
				)?.body,
			).toMatchObject({
				user_id: through.organizationId,
				auth_configs: {
					[toolkit]:
						buildTestConfig().integrations.composio.authConfigIds[toolkit],
				},
				connected_accounts: { [toolkit]: [through.accountRef] },
			});
		},
	);

	it("refuses a response that the tool's output schema refuses", async () => {
		answerTool(generateSlackChannelsTool());
		answerExecute(LIST_CHANNELS, { data: { channels: "none" } });

		await expect(
			composioBroker().run(
				"slack.listChannels",
				generateComposioConnection(),
				{},
			),
		).rejects.toThrow("output schema refuses");
	});

	it("checks again against Composio's current schema before refusing a response", async () => {
		const broker = composioBroker();
		// An older schema, kept from an earlier read, that wanted a field Slack no longer sends.
		answerTool(generateSlackChannelsTool({ required: ["id", "topic"] }));
		answerExecute(LIST_CHANNELS, {
			data: {
				channels: [
					generateComposioSlackChannel({ topic: faker.lorem.words(3) }),
				],
			},
		});
		await broker.run("slack.listChannels", generateComposioConnection(), {});
		answerTool(generateSlackChannelsTool());
		answerExecute(LIST_CHANNELS, {
			data: { channels: [generateComposioSlackChannel()] },
		});

		await expect(
			broker.run("slack.listChannels", generateComposioConnection(), {}),
		).resolves.toHaveLength(1);
	});
});

describe("reading GitHub through Composio's proxy", () => {
	it.each([
		{ type: "User", accountType: "user" },
		{ type: "Organization", accountType: "organization" },
		{ type: "Enterprise", accountType: "organization" },
	] as const)(
		"lists our GitHub App's installation on a GitHub $type account as $accountType",
		async ({ type, accountType }) => {
			const through = generateComposioConnection();
			const installation = generateGithubApiInstallation({ type });
			answerProxy("/user/installations", {
				page: () => ({ total_count: 1, installations: [installation] }),
			});

			await expect(
				composioBroker().run("github.listInstallations", through, {}),
			).resolves.toEqual([
				{
					id: String(installation.id),
					account: installation.account.login,
					account_type: accountType,
					repository_selection: installation.repository_selection,
				},
			]);
			expect(proxyRequests()).toEqual([
				{
					endpoint: "/user/installations",
					userId: through.organizationId,
					connectedAccountId: through.accountRef,
					query: { per_page: "100", page: "1" },
				},
			]);
		},
	);

	it("lists every repository of every installation, across pages, each once", async () => {
		const first = generateGithubApiInstallation();
		const second = generateGithubApiInstallation();
		const shared = generateGithubApiRepository();
		const pages = [
			Array.from({ length: 100 }, () => generateGithubApiRepository()),
			[generateGithubApiRepository(), shared],
		];
		answerProxy("/user/installations", {
			page: () => ({ total_count: 2, installations: [first, second] }),
		});
		answerProxy(`/user/installations/${first.id}/repositories`, {
			page: (number) => ({
				total_count: 102,
				repositories: pages[number - 1] ?? [],
			}),
		});
		answerProxy(`/user/installations/${second.id}/repositories`, {
			page: () => ({ total_count: 1, repositories: [shared] }),
		});

		const repositories = await composioBroker().run(
			"github.listRepositories",
			generateComposioConnection(),
			{},
		);

		expect(repositories).toHaveLength(102);
		expect(
			repositories.filter((entry) => entry.id === String(shared.id)),
		).toEqual([
			{
				id: String(shared.id),
				full_name: shared.full_name,
				private: shared.private,
				url: shared.html_url,
				description: shared.description,
			},
		]);
	});

	it("stops reading a list at the page cap, with its first pages", async () => {
		const config = buildTestConfig().integrations.composio;
		const installation = generateGithubApiInstallation();
		const fullPage = () =>
			Array.from({ length: 100 }, () => generateGithubApiRepository());
		answerProxy("/user/installations", {
			page: () => ({ total_count: 1, installations: [installation] }),
		});
		answerProxy(`/user/installations/${installation.id}/repositories`, {
			page: () => ({ total_count: 100_000, repositories: fullPage() }),
		});

		const repositories = await createComposioBroker({
			...config,
			proxyMaxPages: 3,
		}).run("github.listRepositories", generateComposioConnection(), {});

		// One read for the installations, then two pages of repositories.
		expect(repositories).toHaveLength(200);
		expect(proxyRequests()).toHaveLength(3);
	});

	it("shares one page cap across installations read together", async () => {
		const config = buildTestConfig().integrations.composio;
		const installations = Array.from({ length: 5 }, () =>
			generateGithubApiInstallation(),
		);
		answerProxy("/user/installations", {
			page: () => ({ total_count: 5, installations }),
		});
		for (const installation of installations) {
			answerProxy(`/user/installations/${installation.id}/repositories`, {
				page: () => ({
					total_count: 1,
					repositories: [generateGithubApiRepository()],
				}),
			});
		}

		const repositories = await createComposioBroker({
			...config,
			proxyMaxPages: 3,
		}).run("github.listRepositories", generateComposioConnection(), {});

		expect(proxyRequests()).toHaveLength(3);
		expect(repositories).toHaveLength(2);
	});

	it("refuses an answer GitHub's documented response does not match", async () => {
		answerProxy("/user/installations", {
			page: () => ({ message: "hello world" }),
		});

		await expect(
			composioBroker().run(
				"github.listInstallations",
				generateComposioConnection(),
				{},
			),
		).rejects.toThrow("schema refuses");
	});

	it("fails when GitHub refuses the request", async () => {
		answerProxy("/user/installations", { status: 401 });

		await expect(
			composioBroker().run(
				"github.listInstallations",
				generateComposioConnection(),
				{},
			),
		).rejects.toThrow("answered 401");
	});
});
