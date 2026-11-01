import type { ReactNode } from "react";
import { Text } from "react-email";
import { colors, spacing, typography } from "../../tokens";

const baseStyle = {
	color: colors.textPrimary,
	fontFamily: typography.fontFamily,
	fontSize: typography.fontSizes.md,
	lineHeight: typography.lineHeights.relaxed,
	margin: `0 0 ${spacing.md} 0`,
};

const variants = {
	default: {},
	muted: {
		color: colors.textSecondary,
		fontSize: typography.fontSizes.sm,
	},
};

type ParagraphProps = {
	variant?: keyof typeof variants;
	children: ReactNode;
};

export function Paragraph({ variant = "default", children }: ParagraphProps) {
	return <Text style={{ ...baseStyle, ...variants[variant] }}>{children}</Text>;
}
