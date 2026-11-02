import { useAuth } from "@frubble/react-sdk";
import { useTranslation } from "react-i18next";
import { endSession } from "@/shared/session";

/**
 * A signed-in account that isn't a customer (an admin signed in here): nothing to show it, so the
 * only way on is to sign out and sign in with a customer account.
 */
export function RoleFallback() {
	const { t } = useTranslation("layout");
	const { user } = useAuth();
	return (
		<main data-testid="role-fallback">
			<h1>{t("roleFallback.title")}</h1>
			<p data-testid="role-fallback-email">
				{t("roleFallback.description", { email: user?.email ?? "" })}
			</p>
			<button
				type="button"
				data-testid="role-fallback-sign-out"
				onClick={() => void endSession()}
			>
				{t("signOut")}
			</button>
		</main>
	);
}
