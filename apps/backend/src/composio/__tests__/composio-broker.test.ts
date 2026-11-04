import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { createComposioBroker } from "@/composio";
import { generateComposioGithubOrganization } from "@/composio/__mocks__/generate-composio-github-organization";
import { generateGithubOrganizationsTool } from "@/composio/__mocks__/generate-github-organizations-tool";
import {
	answerAccountGone,
	answerAccountMadeForLastAttempt,
	answerAccountPages,
	answerConnectedAccount,
	answerExecute,
	answerInitiate,
	answerTool,
	composioRequests,
	failDelete,
	failInitiate,
	hangConnectedAccount,
	lastInitiateRequest,
	setupComposioNetwork,
} from "@/composio/__mocks__/mock-composio-network";
import { describeConnectionBrokerContract } from "@/testing/connection-broker-contract";
import { buildTestConfig } from "@/testing/test-environment";

// The real SDK and the real broker; only Composio's HTTP answers are the test's.
setupComposioNetwork();

const STATUSES = {
	pending: "INITIATED",
	active: "ACTIVE",
	failed: "FAILED",
} as const;

const LIST_ORGANIZATIONS =
	"GITHUB_LIST_ORGANIZATIONS_FOR_THE_AUTHENTICATED_USER";

function composioBroker() {
	return createComposioBroker(buildTestConfig().composio);
}

function generateConnectedAccountId() {
	return `ca_${faker.string.alphanumeric(10)}`;
}

function generateAttempt() {
	return {
		organizationId: faker.string.alphanumeric(32),
		provider: "github" as const,
		attemptId: faker.string.uuid(),
		callbackUrl: `${faker.internet.url()}/integrations/callback`,
	};
}

describeConnectionBrokerContract("Composio", () => ({
	broker: composioBroker(),
	answerConnect(redirectUrl) {
		const connectedAccountId = generateConnectedAccountId();
		answerInitiate({ connectedAccountId, redirectUrl });
		return { accountRef: () => connectedAccountId };
	},
	answerState: (accountRef, state) =>
		answerConnectedAccount(accountRef, STATUSES[state]),
	hangState: (accountRef) => hangConnectedAccount(accountRef),
	loseConnect() {
		const connectedAccountId = generateConnectedAccountId();
		failInitiate();
		answerAccountMadeForLastAttempt(connectedAccountId);
		return { accountRef: () => connectedAccountId };
	},
	removedElsewhere: (accountRef) => answerAccountGone(accountRef),
	answerGithubOrganizations(organizations) {
		answerTool(generateGithubOrganizationsTool());
		answerExecute(LIST_ORGANIZATIONS, {
			data: {
				organizations: organizations.map((organization) => ({
					id: Number(organization.id),
					login: organization.login,
					description: organization.description,
					avatar_url: organization.avatarUrl,
				})),
			},
		});
	},
}));

describe("connecting through Composio", () => {
	it("opens the provider's own consent on our auth config, marked with the attempt, with our callback", async () => {
		const attempt = generateAttempt();
		answerInitiate({
			connectedAccountId: generateConnectedAccountId(),
			redirectUrl: faker.internet.url(),
		});

		await composioBroker().startConnect(attempt);

		const initiated = lastInitiateRequest();
		expect(initiated?.auth_config?.id).toBe(
			buildTestConfig().composio.authConfigIds.github,
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
		const connectedAccountId = generateConnectedAccountId();
		answerInitiate({ connectedAccountId, redirectUrl: null });

		await expect(
			composioBroker().startConnect(generateAttempt()),
		).resolves.toEqual({
			accountRef: connectedAccountId,
			redirectUrl: undefined,
		});
	});

	it("finds a lost answer's account on a later page of Composio's listing", async () => {
		const attempt = generateAttempt();
		const lost = generateConnectedAccountId();
		failInitiate();
		answerAccountPages([
			[{ id: generateConnectedAccountId() }],
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
			composioBroker().removeAccount(generateConnectedAccountId()),
		).rejects.toThrow();
	});
});

describe("running an action through Composio", () => {
	function connection() {
		return {
			organizationId: faker.string.alphanumeric(32),
			accountRef: generateConnectedAccountId(),
		};
	}

	it("runs the tool in a session on the organization's own account", async () => {
		const through = connection();
		answerTool(generateGithubOrganizationsTool());
		answerExecute(LIST_ORGANIZATIONS, {
			data: { organizations: [generateComposioGithubOrganization()] },
		});

		await composioBroker().run("github.listOrganizations", through, {});

		expect(
			composioRequests.findLast((entry) =>
				entry.path.endsWith("/tool_router/session"),
			)?.body,
		).toMatchObject({
			user_id: through.organizationId,
			connected_accounts: { github: [through.accountRef] },
		});
	});

	it("refuses a response that the tool's output schema refuses", async () => {
		answerTool(generateGithubOrganizationsTool());
		answerExecute(LIST_ORGANIZATIONS, { data: { message: "hello world" } });

		await expect(
			composioBroker().run("github.listOrganizations", connection(), {}),
		).rejects.toThrow("output schema refuses");
	});

	it("checks again against Composio's current schema before refusing a response", async () => {
		const broker = composioBroker();
		const organization = generateComposioGithubOrganization();
		// An older schema, kept from an earlier read, that wanted a field GitHub no longer sends.
		answerTool(
			generateGithubOrganizationsTool({
				required: ["id", "login", "avatar_url", "url"],
			}),
		);
		answerExecute(LIST_ORGANIZATIONS, {
			data: {
				organizations: [
					{ ...organization, url: "https://api.github.com/orgs/x" },
				],
			},
		});
		await broker.run("github.listOrganizations", connection(), {});
		answerTool(generateGithubOrganizationsTool());
		answerExecute(LIST_ORGANIZATIONS, {
			data: { organizations: [organization] },
		});

		await expect(
			broker.run("github.listOrganizations", connection(), {}),
		).resolves.toHaveLength(1);
	});
});
