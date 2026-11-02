import { useTranslation } from "react-i18next";

/** A signed-in page while the API says who is signed in, inside the app's frame (`AppShell`). */
export function LoadingState() {
	const { t } = useTranslation("layout");
	return (
		<p data-testid="loading-state" role="status" aria-busy="true">
			{t("loading")}
		</p>
	);
}
