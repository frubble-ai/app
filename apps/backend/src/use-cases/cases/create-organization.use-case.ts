import { randomBytes } from "node:crypto";
import { z } from "zod";
import { defineUseCase } from "@/use-cases";
import type { TOrganizationRole } from "@/use-cases/lib/organizations/membership";

const createOrganizationArgsSchema = z.object({
	headers: z.instanceof(Headers),
	name: z
		.string()
		.trim()
		.min(1, "Name is required.")
		.max(80, "Name is too long."),
});

/** The name in lowercase words joined by hyphens, plus a random suffix so slugs never collide. */
function toSlug(name: string): string {
	const base = name
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 40);
	return `${base || "org"}-${randomBytes(3).toString("hex")}`;
}

/** Create an organization; the caller becomes its owner. */
export const createOrganizationUseCase = defineUseCase(
	async function createOrganizationUseCase(
		ctx,
		args: { headers: Headers; name: string },
	): Promise<{ id: string; name: string; role: TOrganizationRole }> {
		const { headers, name } = createOrganizationArgsSchema.parse(args);
		const created = await ctx.auth.api.createOrganization({
			body: { name, slug: toSlug(name) },
			headers,
		});
		if (!created) throw new Error("Better Auth returned no organization");
		return { id: created.id, name: created.name, role: "owner" };
	},
);
