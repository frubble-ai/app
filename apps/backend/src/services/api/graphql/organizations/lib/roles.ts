import { InvitationRole, OrganizationRole } from "@frubble/gql/types";
import type { TOrganizationRole } from "@/use-cases/lib/organizations/membership";

const ROLE_TO_GQL: Record<TOrganizationRole, OrganizationRole> = {
	owner: OrganizationRole.Owner,
	admin: OrganizationRole.Admin,
	member: OrganizationRole.Member,
};

const INVITATION_ROLE_FROM_GQL: Record<InvitationRole, "admin" | "member"> = {
	[InvitationRole.Admin]: "admin",
	[InvitationRole.Member]: "member",
};

export function toGqlRole(role: TOrganizationRole): OrganizationRole {
	return ROLE_TO_GQL[role];
}

export function fromGqlInvitationRole(
	role: InvitationRole,
): "admin" | "member" {
	return INVITATION_ROLE_FROM_GQL[role];
}
