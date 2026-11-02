import type { ReactNode } from "react";
import { Heading as EmailHeading } from "react-email";
import { colors, spacing, typography } from "../../tokens";

const style = {
	color: colors.textPrimary,
	fontFamily: typography.fontFamily,
	fontSize: typography.fontSizes.xxl,
	fontWeight: typography.weights.bold,
	letterSpacing: "-0.01em",
	lineHeight: typography.lineHeights.tight,
	margin: `0 0 ${spacing.md} 0`,
};

export function Heading({ children }: { children: ReactNode }) {
	return (
		<EmailHeading as="h1" style={style}>
			{children}
		</EmailHeading>
	);
}
