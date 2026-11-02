import { useAuth } from "@frubble/react-sdk";
import { useTranslation } from "react-i18next";
import { PageHead } from "@/shared/components/page-head";

/** Where a signed-in customer lands. Nothing to do here yet. */
export function HomeScreen() {
	const { t } = useTranslation("home");
	const { user } = useAuth();
	return (
		<div data-testid="home">
			<PageHead
				title={t("title", { name: user?.name ?? "" })}
				description={t("description")}
			/>
		</div>
	);
}
