import { useTranslation } from "react-i18next";
import type { TCodeFlowError } from "@/shared/code-flow";

/** A code flow's failed step: the API's own reason when it gave one. */
export function CodeFlowError({
	error,
	testId,
}: {
	readonly error: TCodeFlowError | null;
	readonly testId: string;
}) {
	const { t } = useTranslation("auth");
	if (!error) return null;
	return (
		<p role="alert" data-testid={testId}>
			{"message" in error ? error.message : t(error.key)}
		</p>
	);
}
