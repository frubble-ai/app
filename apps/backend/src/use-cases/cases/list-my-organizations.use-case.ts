import { member, organization } from "@frubble/db";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { defineUseCase } from "@/use-cases";
import {
	type TOrganizationRole,
	toOrganizationRole,
} from "@/use-cases/lib/organizations/membership";

const listMyOrganizationsArgsSchema = z.object({ userId: z.string().min(1) });

/** Every organization the caller belongs to, oldest first, with the caller's role in each. */
export const listMyOrganizationsUseCase = defineUseCase(
	async function listMyOrganizationsUseCase(
		ctx,
		args: { userId: string },
	): Promise<Array<{ id: string; name: string; role: TOrganizationRole }>> {
		const { userId } = listMyOrganizationsArgsSchema.parse(args);
		const rows = await ctx.db
			.select({
				id: organization.id,
				name: organization.name,
				role: member.role,
			})
			.from(member)
			.innerJoin(organization, eq(organization.id, member.organizationId))
			.where(eq(member.userId, userId))
			.orderBy(asc(member.createdAt));
		return rows.map((row) => ({ ...row, role: toOrganizationRole(row.role) }));
	},
);
