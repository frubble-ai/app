import { z } from "zod";

// Organizations: the people who share one Frubble workspace.

/** An invitation to join an organization; the link opens it in the app. */
export const organizationInvitationSentSchema = z.object({
	type: z.literal("organization.invitation_sent"),
	email: z.email(),
	organizationName: z.string(),
	inviterName: z.string(),
	acceptUrl: z.url(),
});
