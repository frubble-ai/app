import { faker } from "@faker-js/faker";
import { integrationConnection } from "@frubble/db";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { TTestClone } from "@/testing/integration-bootstrap";
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
import { listIntegrationsUseCase } from "@/use-cases/cases/list-integrations.use-case";
import { previewIntegrationUseCase } from "@/use-cases/cases/preview-integration.use-case";
import { startIntegrationConnectUseCase } from "@/use-cases/cases/start-integration-connect.use-case";

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

/** Start connecting GitHub; the connection id the callback will carry. */
async function startConnecting(
	clone: TTestClone,
	args: { userId: string; organizationId: string },
) {
	const connectedAccountId = `ca_${faker.string.alphanumeric(10)}`;
	clone.integrations.link.mockResolvedValueOnce({
		connectedAccountId,
		redirectUrl: "https://consent.example/github",
	});
	await startIntegrationConnectUseCase({ ...args, provider: "github" });
	const callbackUrl = clone.integrations.link.mock.lastCall?.[0].callbackUrl;
	return {
		connectionId:
			new URL(callbackUrl ?? "").searchParams.get("connection") ?? "",
		connectedAccountId,
	};
}

async function connected(
	clone: TTestClone,
	args: { userId: string; organizationId: string },
) {
	const attempt = await startConnecting(clone, args);
	clone.integrations.getState.mockResolvedValueOnce("active");
	await completeIntegrationConnectUseCase({
		connectionId: attempt.connectionId,
	});
	return attempt;
}

describe("connecting a provider", () => {
	it("links the organization at Composio with our callback, connected only once it finishes", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		clone.integrations.link.mockResolvedValueOnce({
			connectedAccountId: "ca_1",
			redirectUrl: "https://consent.example/github",
		});

		const result = await startIntegrationConnectUseCase({
			userId: owner.id,
			organizationId,
			provider: "github",
		});

		expect(result).toEqual({ redirectUrl: "https://consent.example/github" });
		expect(clone.integrations.link).toHaveBeenCalledWith({
			organizationId,
			provider: "github",
			callbackUrl: expect.stringMatching(
				/^http:\/\/localhost:8080\/integrations\/callback\?connection=[0-9a-f-]{36}$/,
			),
		});
		await expect(
			listIntegrationsUseCase({ userId: owner.id, organizationId }),
		).resolves.toEqual([]);
	});

	it("activates the connection when Composio says it is live", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const { connectionId } = await startConnecting(clone, {
			userId: owner.id,
			organizationId,
		});
		clone.integrations.getState.mockResolvedValueOnce("active");

		await expect(
			completeIntegrationConnectUseCase({ connectionId }),
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
		const first = await connected(clone, args);

		const second = await connected(clone, args);

		expect(clone.integrations.remove).toHaveBeenCalledWith(
			first.connectedAccountId,
		);
		const rows = await clone.db
			.select()
			.from(integrationConnection)
			.where(eq(integrationConnection.organizationId, organizationId));
		expect(
			rows.map((row) => [row.composioConnectedAccountId, row.status]),
		).toEqual([[second.connectedAccountId, "active"]]);
	});

	it("drops a failed attempt at Composio and says it failed", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const attempt = await startConnecting(clone, {
			userId: owner.id,
			organizationId,
		});
		clone.integrations.getState.mockResolvedValueOnce("failed");

		await expect(
			completeIntegrationConnectUseCase({ connectionId: attempt.connectionId }),
		).resolves.toEqual({
			redirectUrl:
				"http://localhost:3000/?integration=github&integration_status=failed",
		});
		expect(clone.integrations.remove).toHaveBeenCalledWith(
			attempt.connectedAccountId,
		);
	});

	it("keeps a replaced account until Composio confirms its removal, then retries", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const args = { userId: owner.id, organizationId };
		const first = await connected(clone, args);
		clone.integrations.remove.mockRejectedValueOnce(new Error("Composio down"));

		await connected(clone, args);
		const retiring = await clone.db
			.select()
			.from(integrationConnection)
			.where(eq(integrationConnection.status, "retiring"));
		expect(retiring.map((row) => row.composioConnectedAccountId)).toEqual([
			first.connectedAccountId,
		]);

		await listIntegrationsUseCase(args);

		const left = await clone.db
			.select()
			.from(integrationConnection)
			.where(eq(integrationConnection.organizationId, organizationId));
		expect(left.map((row) => row.status)).toEqual(["active"]);
	});

	it("shows a connection that went live after its callback once the list is read", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const args = { userId: owner.id, organizationId };
		const { connectionId } = await startConnecting(clone, args);
		clone.integrations.getState.mockResolvedValueOnce("pending");
		await expect(
			completeIntegrationConnectUseCase({ connectionId }),
		).resolves.toEqual({
			redirectUrl:
				"http://localhost:3000/?integration=github&integration_status=pending",
		});
		clone.integrations.getState.mockResolvedValueOnce("active");

		await expect(listIntegrationsUseCase(args)).resolves.toEqual([
			{ provider: "github", connectedAt: expect.anything() },
		]);
	});

	it("still sends the browser back to the app when Composio cannot be reached", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const { connectionId } = await startConnecting(clone, {
			userId: owner.id,
			organizationId,
		});
		clone.integrations.getState.mockRejectedValueOnce(new Error("timeout"));

		await expect(
			completeIntegrationConnectUseCase({ connectionId }),
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
		expect(clone.integrations.link).not.toHaveBeenCalled();
	});
});

describe("using a connection", () => {
	it("previews through the organization's connection for any member", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const { connectedAccountId } = await connected(clone, {
			userId: owner.id,
			organizationId,
		});
		const joined = await plainMember(clone, owner, organizationId);
		const items = [{ id: "1", name: "frubble-ai" }];
		clone.integrations.preview.mockResolvedValueOnce(items);

		await expect(
			previewIntegrationUseCase({
				userId: joined.id,
				organizationId,
				provider: "github",
			}),
		).resolves.toEqual(items);
		expect(clone.integrations.preview).toHaveBeenCalledWith({
			organizationId,
			provider: "github",
			connectedAccountId,
		});
	});

	it("says a provider that is not connected is not found", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);

		await expect(
			previewIntegrationUseCase({
				userId: owner.id,
				organizationId,
				provider: "linear",
			}),
		).rejects.toMatchObject({ name: "NotFoundError" });
	});

	it("disconnecting also retires an unfinished attempt, so its callback cannot reconnect", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const args = { userId: owner.id, organizationId };
		await connected(clone, args);
		const attempt = await startConnecting(clone, args);

		await disconnectIntegrationUseCase({ ...args, provider: "github" });
		clone.integrations.getState.mockResolvedValueOnce("active");

		await expect(
			completeIntegrationConnectUseCase({ connectionId: attempt.connectionId }),
		).resolves.toEqual({
			redirectUrl: "http://localhost:3000/?integration_status=failed",
		});
		await expect(listIntegrationsUseCase(args)).resolves.toEqual([]);
		expect(clone.integrations.remove).toHaveBeenCalledWith(
			attempt.connectedAccountId,
		);
	});

	it("reports connected to both callbacks when two settle the same attempt at once", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const { connectionId } = await startConnecting(clone, {
			userId: owner.id,
			organizationId,
		});
		clone.integrations.getState.mockResolvedValue("active");

		const outcomes = await Promise.all([
			completeIntegrationConnectUseCase({ connectionId }),
			completeIntegrationConnectUseCase({ connectionId }),
		]);

		expect(outcomes).toEqual([
			{
				redirectUrl:
					"http://localhost:3000/?integration=github&integration_status=connected",
			},
			{
				redirectUrl:
					"http://localhost:3000/?integration=github&integration_status=connected",
			},
		]);
	});

	it("never activates an attempt that was retired, even while Composio still holds it", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const args = { userId: owner.id, organizationId };
		await connected(clone, args);
		const attempt = await startConnecting(clone, args);
		clone.integrations.remove.mockRejectedValue(new Error("Composio down"));
		await expect(
			disconnectIntegrationUseCase({ ...args, provider: "github" }),
		).rejects.toMatchObject({ name: "InternalServerError" });
		clone.integrations.getState.mockResolvedValueOnce("active");

		await expect(
			completeIntegrationConnectUseCase({ connectionId: attempt.connectionId }),
		).resolves.toEqual({
			redirectUrl:
				"http://localhost:3000/?integration=github&integration_status=failed",
		});
		const rows = await clone.db
			.select({ status: integrationConnection.status })
			.from(integrationConnection)
			.where(eq(integrationConnection.organizationId, organizationId));
		expect(rows.map((row) => row.status)).toEqual(["retiring", "retiring"]);
	});

	it("does not report a disconnect Composio has not confirmed, and keeps retrying it", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const args = { userId: owner.id, organizationId };
		await connected(clone, args);
		clone.integrations.remove.mockRejectedValueOnce(new Error("Composio down"));

		await expect(
			disconnectIntegrationUseCase({ ...args, provider: "github" }),
		).rejects.toMatchObject({ name: "InternalServerError" });

		await expect(listIntegrationsUseCase(args)).resolves.toEqual([]);
		const left = await clone.db
			.select()
			.from(integrationConnection)
			.where(eq(integrationConnection.organizationId, organizationId));
		expect(left).toEqual([]);
	});

	it("disconnects: Composio revokes it and the organization no longer has it", async () => {
		const clone = getClone();
		const { owner, organizationId } = await ownerWithOrganization(clone);
		const { connectedAccountId } = await connected(clone, {
			userId: owner.id,
			organizationId,
		});

		await disconnectIntegrationUseCase({
			userId: owner.id,
			organizationId,
			provider: "github",
		});

		expect(clone.integrations.remove).toHaveBeenCalledWith(connectedAccountId);
		await expect(
			listIntegrationsUseCase({ userId: owner.id, organizationId }),
		).resolves.toEqual([]);
	});
});
