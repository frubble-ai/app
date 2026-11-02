import type { ReactNode } from "react";
import {
	Body,
	Container,
	Head,
	Html,
	Link,
	Preview,
	Section,
	Text,
} from "react-email";
import { colors, radii, spacing, typography } from "../../tokens";

const BRAND_NAME = "Frubble";

// The fallback when the worker has no EMAIL_SUPPORT_URL.
const DEFAULT_SUPPORT_URL = "mailto:support@frubble.ai";

const body = {
	backgroundColor: colors.bg,
	fontFamily: typography.fontFamily,
	margin: 0,
	padding: `${spacing.xxl} ${spacing.md}`,
};

const container = {
	backgroundColor: colors.surface,
	margin: "0 auto",
	maxWidth: "600px",
	padding: spacing.xxl,
	borderRadius: radii.lg,
	border: `1px solid ${colors.borderSubtle}`,
};

const wordmark = {
	color: colors.textPrimary,
	fontFamily: typography.fontFamily,
	fontSize: typography.fontSizes.lg,
	fontWeight: typography.weights.bold,
	margin: `0 0 ${spacing.xl}`,
};

const footer = {
	marginTop: spacing.xl,
	paddingTop: spacing.lg,
	borderTop: `1px solid ${colors.borderSubtle}`,
};

const footerText = {
	color: colors.textTertiary,
	fontFamily: typography.fontFamily,
	fontSize: typography.fontSizes.sm,
	lineHeight: typography.lineHeights.normal,
	margin: 0,
};

const footerLink = {
	color: colors.textTertiary,
	textDecoration: "underline",
};

type LayoutProps = {
	preview: string;
	supportUrl?: string;
	children: ReactNode;
};

export function Layout({
	preview,
	supportUrl = DEFAULT_SUPPORT_URL,
	children,
}: LayoutProps) {
	return (
		<Html>
			<Head />
			<Preview>{preview}</Preview>
			<Body style={body}>
				<Container style={container}>
					<Text style={wordmark}>{BRAND_NAME}</Text>
					{children}
					<Section style={footer}>
						<Text style={footerText}>
							{BRAND_NAME} · You're receiving this because of a request made
							with your email address.
							<br />
							<Link href={supportUrl} style={footerLink}>
								Support
							</Link>
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
}
