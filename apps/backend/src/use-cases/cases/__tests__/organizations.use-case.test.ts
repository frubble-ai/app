import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { setupIntegrationTestContext } from "@/testing/setup-integration-test-context";
import { signedInTestUser } from "@/testing/signed-in-test-user";
import { acceptOrganizationInvitationUseCase } from "@/use-cases/cases/accept-organization-invitation.use-case";
import { createOrganizationUseCase } from "@/use-cases/cases/create-organization.use-case";
import { getOrganizationUseCase } from "@/use-cases/cases/get-organization.use-case";
import { inviteOrganizationMemberUseCase } from "@/use-cases/cases/invite-organization-member.use-case";
import { listMyOrganizationsUseCase } from "@/use-cases/cases/list-my-organizations.use-case";

const { getClone } = setupIntegrationTestContext();

function newEmail(): string {
	return `org+${faker.string.alphanumeric(8).toLowerCase()}@example.com`;
}

describe("organizations", () => {
	it("makes the creator the owner and lists it as theirs", async () => {
		const clone = getClone();
		const owner = await signedInTestUser(clone);

		const created = await createOrganizationUseCase({
			headers: owner.headers,
			name: "Acme Studio",
		});

		expect(created).toMatchObject({ name: "Acme Studio", role: "owner" });
		await expect(
			listMyOrganizationsUseCase({ userId: owner.id }),
		).resolves.toEqual([
			{ id: created.id, name: "Acme Studio", role: "owner" },
		]);
	});

	it("hides an organization from someone outside it", async () => {
		const clone = getClone();
		const owner = await signedInTestUser(clone);
		const outsider = await signedInTestUser(clone);
		const { id } = await createOrganizationUseCase({
			headers: owner.headers,
			name: "Private Co",
		});

		await expect(
			getOrganizationUseCase({ userId: outsider.id, organizationId: id }),
		).rejects.toMatchObject({ name: "NotFoundError" });
	});

	it("emails an invitation that the invitee accepts to become a member", async () => {
		const clone = getClone();
		const owner = await signedInTestUser(clone);
		const { id: organizationId } = await createOrganizationUseCase({
			headers: owner.headers,
			name: "Team One",
		});
		const inviteeEmail = newEmail();

		const invitation = await inviteOrganizationMemberUseCase({
			userId: owner.id,
			inviterName: owner.name,
			headers: owner.headers,
			organizationId,
			email: inviteeEmail,
			role: "member",
		});

		expect(clone.captured.emails).toEqual([
			expect.objectContaining({
				type: "organization.invitation_sent",
				email: inviteeEmail,
				organizationName: "Team One",
				acceptUrl: `http://localhost:3000/invitations/${invitation.id}`,
			}),
		]);

		const invitee = await signedInTestUser(clone, inviteeEmail);
		await expect(
			acceptOrganizationInvitationUseCase({
				headers: invitee.headers,
				invitationId: invitation.id,
			}),
		).resolves.toEqual({ organizationId });

		const details = await getOrganizationUseCase({
			userId: invitee.id,
			organizationId,
		});
		expect(details.members.map((entry) => [entry.email, entry.role])).toEqual(
			expect.arrayContaining([
				[owner.email, "owner"],
				[inviteeEmail, "member"],
			]),
		);
		expect(details.invitations).toEqual([]);
	});

	it("refuses an invitation from a plain member", async () => {
		const clone = getClone();
		const owner = await signedInTestUser(clone);
		const { id: organizationId } = await createOrganizationUseCase({
			headers: owner.headers,
			name: "Team Two",
		});
		const memberEmail = newEmail();
		const invitation = await inviteOrganizationMemberUseCase({
			userId: owner.id,
			inviterName: owner.name,
			headers: owner.headers,
			organizationId,
			email: memberEmail,
			role: "member",
		});
		const plainMember = await signedInTestUser(clone, memberEmail);
		await acceptOrganizationInvitationUseCase({
			headers: plainMember.headers,
			invitationId: invitation.id,
		});

		await expect(
			inviteOrganizationMemberUseCase({
				userId: plainMember.id,
				inviterName: plainMember.name,
				headers: plainMember.headers,
				organizationId,
				email: newEmail(),
				role: "member",
			}),
		).rejects.toMatchObject({ name: "ForbiddenError" });
	});

	it("refuses an invitation accepted by a different address", async () => {
		const clone = getClone();
		const owner = await signedInTestUser(clone);
		const { id: organizationId } = await createOrganizationUseCase({
			headers: owner.headers,
			name: "Team Three",
		});
		const invitation = await inviteOrganizationMemberUseCase({
			userId: owner.id,
			inviterName: owner.name,
			headers: owner.headers,
			organizationId,
			email: newEmail(),
			role: "admin",
		});
		const stranger = await signedInTestUser(clone);

		await expect(
			acceptOrganizationInvitationUseCase({
				headers: stranger.headers,
				invitationId: invitation.id,
			}),
		).rejects.toMatchObject({ name: "ForbiddenError" });
	});
});
