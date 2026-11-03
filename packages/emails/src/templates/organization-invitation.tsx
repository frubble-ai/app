import { Button } from "react-email";
import type { TEmailLinks } from "../index";
import { Heading } from "../shared/components/heading/index";
import { Layout } from "../shared/components/layout/index";
import { Paragraph } from "../shared/components/paragraph/index";
import { colors, radii, spacing, typography } from "../shared/tokens";

// Transactional: someone added the reader's address to their organization.
export function OrganizationInvitationEmail({
	organizationName,
	inviterName,
	acceptUrl,
	supportUrl,
}: {
	organizationName: string;
	inviterName: string;
	acceptUrl: string;
} & TEmailLinks) {
	return (
		<Layout
			preview={`${inviterName} invited you to ${organizationName} on Frubble`}
			supportUrl={supportUrl}
		>
			<Heading>Join {organizationName}</Heading>
			<Paragraph>
				{inviterName} invited you to {organizationName} on Frubble. Sign in or
				create an account with this address, then accept:
			</Paragraph>
			<Button
				href={acceptUrl}
				style={{
					backgroundColor: colors.textPrimary,
					color: colors.surface,
					fontFamily: typography.fontFamily,
					fontSize: typography.fontSizes.md,
					padding: `12px ${spacing.lg}`,
					borderRadius: radii.md,
					margin: `0 0 ${spacing.md} 0`,
				}}
			>
				Accept the invitation
			</Button>
			<Paragraph variant="muted">
				This invitation expires in 7 days. If you weren't expecting it, you can
				safely ignore this email.
			</Paragraph>
		</Layout>
	);
}
