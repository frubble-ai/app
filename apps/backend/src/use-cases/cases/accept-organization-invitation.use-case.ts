import { z } from "zod";
import { defineUseCase } from "@/use-cases";
import { betterAuthIdSchema } from "@/use-cases/lib/organizations/membership";

const acceptOrganizationInvitationArgsSchema = z.object({
	headers: z.instanceof(Headers),
	invitationId: betterAuthIdSchema,
});

/**
 * Join an organization through its invitation. Better Auth checks the invitation is open and was
 * sent to the caller's verified address.
 */
export const acceptOrganizationInvitationUseCase = defineUseCase(
	async function acceptOrganizationInvitationUseCase(
		ctx,
		args: { headers: Headers; invitationId: string },
	): Promise<{ organizationId: string }> {
		const { headers, invitationId } =
			acceptOrganizationInvitationArgsSchema.parse(args);
		const accepted = await ctx.auth.api.acceptInvitation({
			body: { invitationId },
			headers,
		});
		if (!accepted) throw new Error("Better Auth returned no membership");
		return { organizationId: accepted.member.organizationId };
	},
);
