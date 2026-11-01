import type { ReactNode } from "react";
import { Text } from "react-email";
import { colors, radii, spacing, typography } from "../../tokens";

const style = {
	backgroundColor: colors.surface2,
	border: `1px solid ${colors.borderDefault}`,
	borderRadius: radii.md,
	color: colors.textPrimary,
	display: "inline-block",
	fontFamily: '"SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace',
	fontSize: typography.fontSizes.xxl,
	fontWeight: typography.weights.bold,
	letterSpacing: "0.3em",
	margin: `0 0 ${spacing.lg} 0`,
	padding: `${spacing.md} ${spacing.lg}`,
};

/** A one-time code the reader types into the app. */
export function Code({ children }: { children: ReactNode }) {
	return <Text style={style}>{children}</Text>;
}
