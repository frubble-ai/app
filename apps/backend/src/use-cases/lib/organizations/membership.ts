import { member, organization, type TDb } from "@frubble/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { forbidden, notFound } from "@/use-cases/lib/shared/domain-errors";

/** The organization plugin's default roles. */
const ORGANIZATION_ROLES = ["owner", "admin", "member"] as const;
export type TOrganizationRole = (typeof ORGANIZATION_ROLES)[number];

/** Who may connect, disconnect and invite. */
export const MANAGER_ROLES: readonly TOrganizationRole[] = ["owner", "admin"];

/** A Better Auth id (organization, invitation): not a UUID. */
export const betterAuthIdSchema = z
	.string()
	.regex(/^[A-Za-z0-9_-]{16,64}$/, "Invalid id");

export type TMembership = {
	organizationId: string;
	organizationName: string;
	role: TOrganizationRole;
};

/**
 * The caller's membership of an organization. Not a member reads as not found, so ids of other
 * organizations reveal nothing; a member without one of `roles` is forbidden.
 */
export async function requireMembership(
	db: TDb,
	args: {
		userId: string;
		organizationId: string;
		roles?: readonly TOrganizationRole[];
	},
): Promise<TMembership> {
	const [row] = await db
		.select({ role: member.role, name: organization.name })
		.from(member)
		.innerJoin(organization, eq(organization.id, member.organizationId))
		.where(
			and(
				eq(member.organizationId, args.organizationId),
				eq(member.userId, args.userId),
			),
		)
		.limit(1);
	if (!row) throw notFound("Organization not found.");
	const role = toOrganizationRole(row.role);
	if (args.roles && !args.roles.includes(role)) {
		throw forbidden("Only an owner or an admin can do this.");
	}
	return {
		organizationId: args.organizationId,
		organizationName: row.name,
		role,
	};
}

/** A stored role; anything unknown is treated as the least privileged. */
export function toOrganizationRole(raw: string): TOrganizationRole {
	return (ORGANIZATION_ROLES as readonly string[]).includes(raw)
		? (raw as TOrganizationRole)
		: "member";
}
