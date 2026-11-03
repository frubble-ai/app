import { invitation, member, user } from "@frubble/db";
import { and, asc, eq, gt } from "drizzle-orm";
import { DateTime } from "luxon";
import { z } from "zod";
import { defineUseCase } from "@/use-cases";
import {
	betterAuthIdSchema,
	requireMembership,
	type TOrganizationRole,
	toOrganizationRole,
} from "@/use-cases/lib/organizations/membership";

const getOrganizationArgsSchema = z.object({
	userId: z.string().min(1),
	organizationId: betterAuthIdSchema,
});

export type TOrganizationDetails = {
	id: string;
	name: string;
	role: TOrganizationRole;
	members: Array<{
		userId: string;
		name: string;
		email: string;
		role: TOrganizationRole;
	}>;
	invitations: Array<{
		id: string;
		email: string;
		role: TOrganizationRole;
		expiresAt: DateTime;
	}>;
};

/** An organization the caller belongs to: its members and the invitations still open. */
export const getOrganizationUseCase = defineUseCase(
	async function getOrganizationUseCase(
		ctx,
		args: { userId: string; organizationId: string },
	): Promise<TOrganizationDetails> {
		const { userId, organizationId } = getOrganizationArgsSchema.parse(args);
		const membership = await requireMembership(ctx, { userId, organizationId });

		const members = await ctx.db
			.select({
				userId: member.userId,
				name: user.name,
				email: user.email,
				role: member.role,
			})
			.from(member)
			.innerJoin(user, eq(user.id, member.userId))
			.where(eq(member.organizationId, organizationId))
			.orderBy(asc(member.createdAt));

		const invitations = await ctx.db
			.select({
				id: invitation.id,
				email: invitation.email,
				role: invitation.role,
				expiresAt: invitation.expiresAt,
			})
			.from(invitation)
			.where(
				and(
					eq(invitation.organizationId, organizationId),
					eq(invitation.status, "pending"),
					gt(invitation.expiresAt, DateTime.utc().toJSDate()),
				),
			)
			.orderBy(asc(invitation.createdAt));

		return {
			id: organizationId,
			name: membership.organizationName,
			role: membership.role,
			members: members.map((row) => ({
				...row,
				role: toOrganizationRole(row.role),
			})),
			invitations: invitations.map((row) => ({
				id: row.id,
				email: row.email,
				role: toOrganizationRole(row.role ?? "member"),
				expiresAt: DateTime.fromJSDate(row.expiresAt, { zone: "utc" }),
			})),
		};
	},
);
