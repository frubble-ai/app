import { DateTime } from "luxon";
import { z } from "zod";
import { defineUseCase } from "@/use-cases";
import {
	betterAuthIdSchema,
	MANAGER_ROLES,
	requireMembership,
} from "@/use-cases/lib/organizations/membership";

const inviteOrganizationMemberArgsSchema = z.object({
	userId: z.string().min(1),
	inviterName: z.string(),
	headers: z.instanceof(Headers),
	organizationId: betterAuthIdSchema,
	email: z
		.email("Enter a valid email address.")
		.transform((value) => value.toLowerCase()),
	role: z.enum(["admin", "member"]),
});

/** Invite an address to the organization (owners and admins only) and email it the link. */
export const inviteOrganizationMemberUseCase = defineUseCase(
	async function inviteOrganizationMemberUseCase(
		ctx,
		args: {
			userId: string;
			inviterName: string;
			headers: Headers;
			organizationId: string;
			email: string;
			role: "admin" | "member";
		},
	): Promise<{
		id: string;
		email: string;
		role: "admin" | "member";
		expiresAt: DateTime;
	}> {
		const parsed = inviteOrganizationMemberArgsSchema.parse(args);
		const membership = await requireMembership(ctx, {
			userId: parsed.userId,
			organizationId: parsed.organizationId,
			roles: MANAGER_ROLES,
		});

		const created = await ctx.auth.api.createInvitation({
			body: {
				email: parsed.email,
				role: parsed.role,
				organizationId: parsed.organizationId,
			},
			headers: parsed.headers,
		});

		await ctx.messages.send({
			type: "organization.invitation_sent",
			email: parsed.email,
			organizationName: membership.organizationName,
			inviterName: parsed.inviterName,
			acceptUrl: `${ctx.config.appUrl}/invitations/${created.id}`,
		});

		return {
			id: created.id,
			email: parsed.email,
			role: parsed.role,
			expiresAt: DateTime.fromJSDate(new Date(created.expiresAt), {
				zone: "utc",
			}),
		};
	},
);
