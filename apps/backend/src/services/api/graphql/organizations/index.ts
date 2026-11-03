import {
	CreateOrganizationInputSchema,
	InviteOrganizationMemberInputSchema,
} from "@frubble/gql/validation";
import type { Resolvers } from "@/__generated__/resolvers-types";
import { parseSchema } from "@/services/api/graphql/lib/errors";
import { requireAuth } from "@/services/api/graphql/shared";
import { acceptOrganizationInvitationUseCase } from "@/use-cases/cases/accept-organization-invitation.use-case";
import { createOrganizationUseCase } from "@/use-cases/cases/create-organization.use-case";
import { getOrganizationUseCase } from "@/use-cases/cases/get-organization.use-case";
import { inviteOrganizationMemberUseCase } from "@/use-cases/cases/invite-organization-member.use-case";
import { listMyOrganizationsUseCase } from "@/use-cases/cases/list-my-organizations.use-case";
import { fromGqlInvitationRole, toGqlRole } from "./lib/roles";

export function createOrganizationResolvers(): Resolvers {
	return {
		Query: {
			myOrganizations: requireAuth(async (_parent, _args, context) => {
				const organizations = await listMyOrganizationsUseCase({
					userId: context.user.id,
				});
				return organizations.map((entry) => ({
					...entry,
					role: toGqlRole(entry.role),
				}));
			}),

			organization: requireAuth(async (_parent, args, context) => {
				const details = await getOrganizationUseCase({
					userId: context.user.id,
					organizationId: args.id,
				});
				return {
					...details,
					role: toGqlRole(details.role),
					members: details.members.map((entry) => ({
						...entry,
						role: toGqlRole(entry.role),
					})),
					invitations: details.invitations.map((entry) => ({
						...entry,
						role: toGqlRole(entry.role),
						expiresAt: entry.expiresAt.toISO() ?? "",
					})),
				};
			}),
		},
		Mutation: {
			createOrganization: requireAuth(async (_parent, args, context) => {
				const parsed = parseSchema(CreateOrganizationInputSchema(), args.input);
				const created = await createOrganizationUseCase({
					headers: context.requestHeaders,
					name: parsed.name,
				});
				return { ...created, role: toGqlRole(created.role) };
			}),

			inviteOrganizationMember: requireAuth(async (_parent, args, context) => {
				const parsed = parseSchema(
					InviteOrganizationMemberInputSchema(),
					args.input,
				);
				const invited = await inviteOrganizationMemberUseCase({
					userId: context.user.id,
					inviterName: context.user.name,
					headers: context.requestHeaders,
					organizationId: parsed.organizationId,
					email: parsed.email,
					role: fromGqlInvitationRole(parsed.role),
				});
				return {
					...invited,
					role: toGqlRole(invited.role),
					expiresAt: invited.expiresAt.toISO() ?? "",
				};
			}),

			acceptOrganizationInvitation: requireAuth(
				async (_parent, args, context) =>
					acceptOrganizationInvitationUseCase({
						headers: context.requestHeaders,
						invitationId: args.invitationId,
					}),
			),
		},
	};
}
