import { faker } from "@faker-js/faker";
import { integrationConnection } from "@frubble/db";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { TTestClone } from "@/testing/integration-bootstrap";
import {
	answerAccountMadeForLastAttempt,
	answerConnectedAccount,
	answerExecute,
	answerInitiate,
	answerTool,
	composioRequests,
	deletedAccounts,
	failConnectedAccount,
	failDelete,
	failInitiate,
	lastCallbackUrl,
	lastInitiateRequest,
	restoreDelete,
} from "@/testing/mock-composio-network";
import { setupIntegrationTestContext } from "@/testing/setup-integration-test-context";
import {
	signedInTestUser,
	type TSignedInTestUser,
} from "@/testing/signed-in-test-user";
import { generateGithubOrganization } from "@/use-cases/cases/__mocks__/generate-github-organization";
import { generateGithubOrganizationsTool } from "@/use-cases/cases/__mocks__/generate-github-organizations-tool";
import { acceptOrganizationInvitationUseCase } from "@/use-cases/cases/accept-organization-invitation.use-case";
import { completeIntegrationConnectUseCase } from "@/use-cases/cases/complete-integration-connect.use-case";
import { createOrganizationUseCase } from "@/use-cases/cases/create-organization.use-case";
import { disconnectIntegrationUseCase } from "@/use-cases/cases/disconnect-integration.use-case";
import { inviteOrganizationMemberUseCase } from "@/use-cases/cases/invite-organization-member.use-case";
import { listGithubOrganizationsUseCase } from "@/use-cases/cases/list-github-organizations.use-case";
import { listIntegrationsUseCase } from "@/use-cases/cases/list-integrations.use-case";
import { listLinearTeamsUseCase } from "@/use-cases/cases/list-linear-teams.use-case";
import { startIntegrationConnectUseCase } from "@/use-cases/cases/start-integration-connect.use-case";

const { getClone } = setupIntegrationTestContext();

const CONSENT_PAGE = "https://github.com/login/oauth/authorize?client_id=test";

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

/** Start connecting GitHub; the connection id our callback will carry. */
async function startConnecting(args: {
	userId: string;
	organizationId: string;
}) {
	const connectedAccountId = `ca_${faker.string.alphanumeric(10)}`;
	answerInitiate({ connectedAccountId, redirectUrl: CONSENT_PAGE });
	await startIntegrationConnectUseCase({ ...args, provider: "github" });
	return {
		connectionId:
			new URL(lastCallbackUrl()).searchParams.get("connection") ?? "",
		connectedAccountId,
	};
}

async function connected(args: { userId: string; organizationId: string }) {
	const attempt = await startConnecting(args);
	answerConnectedAccount(attempt.connectedAccountId, "ACTIVE", { once: true });
	await completeIntegrationConnectUseCase({
		connectionId: attempt.connectionId,
	});
	return attempt;
}

async function rowsOf(clone: TTestClone, organizationId: string) {
	return clone.db
		.select({
			status: integrationConnection.status,
			account: integrationConnection.composioConnectedAccountId,
		})
		.from(integrationConnection)
		.where(eq(integrationConnection.organizationId, organizationId));
}

describe("connecting a provider", () => {
	it("sends the user straight to the provider's consent on our auth config, with our callback", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		answerInitiate({ connectedAccountId: "ca_1", redirectUrl: CONSENT_PAGE });

		await expect(
			startIntegrationConnectUseCase({
				userId: owner.id,
				organizationId,
				provider: "github",
			}),
		).resolves.toEqual({ redirectUrl: CONSENT_PAGE });

		const initiated = lastInitiateRequest();
		expect(initiated?.auth_config?.id).toBe("ac_test_github");
		expect(initiated?.connection).toMatchObject({
			user_id: organizationId,
			state: {
				authScheme: "OAUTH2",
				val: { status: "INITIALIZING", long_redirect_url: true },
			},
		});
		expect(initiated?.connection?.callback_url).toBe(
			`http://localhost:8080/integrations/callback?connection=${initiated?.connection?.alias}`,
		);
		await expect(
			listIntegrationsUseCase({ userId: owner.id, organizationId }),
		).resolves.toEqual([]);
	});

	it("retires the attempt when Composio gives no page to send the user to", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		answerInitiate({ connectedAccountId: "ca_no_page", redirectUrl: null });

		await expect(
			startIntegrationConnectUseCase({
				userId: owner.id,
				organizationId,
				provider: "github",
			}),
		).rejects.toThrow();

		expect(deletedAccounts()).toEqual(["ca_no_page"]);
		await expect(rowsOf(clone, organizationId)).resolves.toEqual([]);
	});

	it("removes an account Composio made though its answer to initiate was lost", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		failInitiate();
		answerAccountMadeForLastAttempt("ca_lost");

		await expect(
			startIntegrationConnectUseCase({
				userId: owner.id,
				organizationId,
				provider: "github",
			}),
		).rejects.toThrow();

		expect(deletedAccounts()).toEqual(["ca_lost"]);
		await expect(rowsOf(clone, organizationId)).resolves.toEqual([]);
	});

	it("keeps a connection another settle activated when a later answer says it failed", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const attempt = await startConnecting({ userId: owner.id, organizationId });
		// The second answer arrives after the first settle has activated the connection.
		answerConnectedAccount(attempt.connectedAccountId, "FAILED", {
			once: true,
			delayMs: 500,
		});
		answerConnectedAccount(attempt.connectedAccountId, "ACTIVE", {
			once: true,
		});

		await Promise.all([
			completeIntegrationConnectUseCase({ connectionId: attempt.connectionId }),
			completeIntegrationConnectUseCase({ connectionId: attempt.connectionId }),
		]);

		await expect(rowsOf(clone, organizationId)).resolves.toEqual([
			{ status: "active", account: attempt.connectedAccountId },
		]);
		expect(deletedAccounts()).toEqual([]);
	});

	it("activates the connection when Composio says it is live", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const attempt = await startConnecting({ userId: owner.id, organizationId });
		answerConnectedAccount(attempt.connectedAccountId, "ACTIVE");

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

	it("replaces the previous connection and removes it at Composio", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const args = { userId: owner.id, organizationId };
		const first = await connected(args);

		const second = await connected(args);

		expect(deletedAccounts()).toContain(first.connectedAccountId);
		await expect(rowsOf(clone, organizationId)).resolves.toEqual([
			{ status: "active", account: second.connectedAccountId },
		]);
	});

	it("drops a failed attempt at Composio and says it failed", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const attempt = await startConnecting({ userId: owner.id, organizationId });
		answerConnectedAccount(attempt.connectedAccountId, "FAILED");

		await expect(
			completeIntegrationConnectUseCase({ connectionId: attempt.connectionId }),
		).resolves.toEqual({
			redirectUrl:
				"http://localhost:3000/?integration=github&integration_status=failed",
		});
		expect(deletedAccounts()).toEqual([attempt.connectedAccountId]);
	});

	it("keeps a replaced account until Composio confirms its removal, then retries", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const args = { userId: owner.id, organizationId };
		const first = await connected(args);
		failDelete();

		await connected(args);
		expect(
			(await rowsOf(clone, organizationId)).find(
				(row) => row.status === "retiring",
			),
		).toEqual({ status: "retiring", account: first.connectedAccountId });

		restoreDelete();
		await listIntegrationsUseCase(args);

		expect(
			(await rowsOf(clone, organizationId)).map((row) => row.status),
		).toEqual(["active"]);
	});

	it("shows a connection that went live after its callback once the list is read", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const args = { userId: owner.id, organizationId };
		const attempt = await startConnecting(args);
		answerConnectedAccount(attempt.connectedAccountId, "ACTIVE");
		answerConnectedAccount(attempt.connectedAccountId, "INITIATED", {
			once: true,
		});

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

	it("still sends the browser back to the app when Composio cannot be reached", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const attempt = await startConnecting({ userId: owner.id, organizationId });
		failConnectedAccount(attempt.connectedAccountId);

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
		expect(composioRequests).toEqual([]);
	});

	it("reports connected to both callbacks when two settle the same attempt at once", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const attempt = await startConnecting({ userId: owner.id, organizationId });
		answerConnectedAccount(attempt.connectedAccountId, "ACTIVE");
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
	it("lists the GitHub organizations for any member, through the organization's own account", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const { connectedAccountId } = await connected({
			userId: owner.id,
			organizationId,
		});
		const joined = await plainMember(clone, owner, organizationId);
		const organization = generateGithubOrganization();
		answerTool(generateGithubOrganizationsTool());
		answerExecute("GITHUB_LIST_ORGANIZATIONS_FOR_THE_AUTHENTICATED_USER", {
			data: { organizations: [organization] },
		});

		await expect(
			listGithubOrganizationsUseCase({ userId: joined.id, organizationId }),
		).resolves.toEqual([
			{
				id: String(organization.id),
				login: organization.login,
				description: null,
				avatarUrl: organization.avatar_url,
			},
		]);
		expect(
			composioRequests.findLast((entry) =>
				entry.path.endsWith("/tool_router/session"),
			)?.body,
		).toMatchObject({
			user_id: organizationId,
			connected_accounts: { github: [connectedAccountId] },
		});
	});

	it("refuses a response that the tool's output schema refuses", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		await connected({ userId: owner.id, organizationId });
		answerTool(generateGithubOrganizationsTool());
		answerExecute("GITHUB_LIST_ORGANIZATIONS_FOR_THE_AUTHENTICATED_USER", {
			data: { message: "hello world" },
		});

		await expect(
			listGithubOrganizationsUseCase({ userId: owner.id, organizationId }),
		).rejects.toThrow("output schema refuses");
	});

	it("checks again against Composio's current schema before refusing a response", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		await connected({ userId: owner.id, organizationId });
		const organization = generateGithubOrganization();
		// An older schema, kept from an earlier read, that wanted a field GitHub no longer sends.
		answerTool(
			generateGithubOrganizationsTool({
				required: ["id", "login", "avatar_url", "url"],
			}),
		);
		answerExecute("GITHUB_LIST_ORGANIZATIONS_FOR_THE_AUTHENTICATED_USER", {
			data: {
				organizations: [
					{ ...organization, url: "https://api.github.com/orgs/x" },
				],
			},
		});
		await listGithubOrganizationsUseCase({ userId: owner.id, organizationId });
		answerTool(generateGithubOrganizationsTool());
		answerExecute("GITHUB_LIST_ORGANIZATIONS_FOR_THE_AUTHENTICATED_USER", {
			data: { organizations: [organization] },
		});

		await expect(
			listGithubOrganizationsUseCase({ userId: owner.id, organizationId }),
		).resolves.toHaveLength(1);
	});

	it("says a provider that is not connected is not found", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);

		await expect(
			listLinearTeamsUseCase({ userId: owner.id, organizationId }),
		).rejects.toMatchObject({ name: "NotFoundError" });
	});
});

describe("disconnecting", () => {
	it("removes the account at Composio and the organization no longer has it", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const args = { userId: owner.id, organizationId };
		const { connectedAccountId } = await connected(args);

		await disconnectIntegrationUseCase({ ...args, provider: "github" });

		expect(deletedAccounts()).toEqual([connectedAccountId]);
		await expect(listIntegrationsUseCase(args)).resolves.toEqual([]);
	});

	it("also retires an unfinished attempt, so its callback cannot reconnect", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const args = { userId: owner.id, organizationId };
		await connected(args);
		const attempt = await startConnecting(args);

		await disconnectIntegrationUseCase({ ...args, provider: "github" });
		answerConnectedAccount(attempt.connectedAccountId, "ACTIVE");

		await expect(
			completeIntegrationConnectUseCase({ connectionId: attempt.connectionId }),
		).resolves.toEqual({
			redirectUrl: "http://localhost:3000/?integration_status=failed",
		});
		await expect(listIntegrationsUseCase(args)).resolves.toEqual([]);
	});

	it("does not report a disconnect Composio has not confirmed, and keeps retrying it", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const args = { userId: owner.id, organizationId };
		await connected(args);
		failDelete();

		await expect(
			disconnectIntegrationUseCase({ ...args, provider: "github" }),
		).rejects.toMatchObject({ name: "InternalServerError" });

		restoreDelete();
		await expect(listIntegrationsUseCase(args)).resolves.toEqual([]);
		await expect(rowsOf(clone, organizationId)).resolves.toEqual([]);
	});

	it("fails a connect that a disconnect overtook while Composio created the account", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const args = { userId: owner.id, organizationId };
		await connected(args);
		answerInitiate({
			connectedAccountId: "ca_overtaken",
			redirectUrl: CONSENT_PAGE,
			before: () =>
				disconnectIntegrationUseCase({ ...args, provider: "github" }),
		});

		await expect(
			startIntegrationConnectUseCase({ ...args, provider: "github" }),
		).rejects.toMatchObject({ name: "BadInputError" });

		expect(deletedAccounts()).toContain("ca_overtaken");
		await expect(rowsOf(clone, organizationId)).resolves.toEqual([]);
	});

	it("keeps the overtaken account on a retiring row when Composio fails to remove it", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const args = { userId: owner.id, organizationId };
		await connected(args);
		answerInitiate({
			connectedAccountId: "ca_overtaken",
			redirectUrl: CONSENT_PAGE,
			before: async () => {
				await disconnectIntegrationUseCase({ ...args, provider: "github" });
				failDelete();
			},
		});

		await expect(
			startIntegrationConnectUseCase({ ...args, provider: "github" }),
		).rejects.toMatchObject({ name: "BadInputError" });
		await expect(rowsOf(clone, organizationId)).resolves.toEqual([
			{ status: "retiring", account: "ca_overtaken" },
		]);

		restoreDelete();
		await listIntegrationsUseCase(args);

		// The failed attempts (the SDK retries them) and the one that worked.
		expect(
			deletedAccounts().filter((id) => id === "ca_overtaken").length,
		).toBeGreaterThan(1);
		await expect(rowsOf(clone, organizationId)).resolves.toEqual([]);
	});
});
