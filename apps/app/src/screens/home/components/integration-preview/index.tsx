import {
	type IntegrationProvider,
	useIntegrationPreviewLazyQuery,
} from "@frubble/react-sdk";
import { useTranslation } from "react-i18next";
import { providerSlug } from "@/screens/home/lib/providers";

/** A live read through the connection: GitHub organizations, Linear teams, Slack channels. */
export function IntegrationPreview({
	organizationId,
	provider,
}: {
	organizationId: string;
	provider: IntegrationProvider;
}) {
	const { t } = useTranslation("home");
	const slug = providerSlug(provider);
	const [load, { data, loading, error, called }] =
		useIntegrationPreviewLazyQuery({
			fetchPolicy: "network-only",
		});
	const items = data?.integrationPreview ?? [];

	return (
		<div className="preview" data-testid={`integration-preview-${slug}`}>
			<button
				type="button"
				disabled={loading}
				data-testid={`integration-preview-load-${slug}`}
				onClick={() =>
					void load({ variables: { input: { organizationId, provider } } })
				}
			>
				{t(
					`integrations.previewAction.${slug}` as "integrations.previewAction.github",
				)}
			</button>
			{error ? (
				<p role="alert" data-testid={`integration-preview-error-${slug}`}>
					{t("integrations.previewFailed")}
				</p>
			) : null}
			{called && !loading && !error && items.length === 0 ? (
				<p data-testid={`integration-preview-empty-${slug}`}>
					{t("integrations.previewEmpty")}
				</p>
			) : null}
			{items.length > 0 ? (
				<ul data-testid={`integration-preview-items-${slug}`}>
					{items.map((item) => (
						<li key={item.id}>{item.name}</li>
					))}
				</ul>
			) : null}
		</div>
	);
}
