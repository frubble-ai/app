import { useTranslation } from "react-i18next";

/**
 * Before the app can render anything (the page's JavaScript loading, the saved session read).
 * `AppProviders` renders it until the session loads, which is also what the server sends
 * (`app/layout.tsx`).
 */
export function SplashScreen() {
	const { t } = useTranslation("layout");
	return (
		<main data-testid="splash-screen" role="status" aria-busy="true">
			{t("loading")}
		</main>
	);
}
