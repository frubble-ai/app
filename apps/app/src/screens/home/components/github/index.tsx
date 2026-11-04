import {
	useGithubAppInstallUrlQuery,
	useGithubOrganizationsLazyQuery,
} from "@frubble/react-sdk";
import { useTranslation } from "react-i18next";

/**
 * The GitHub organizations the connected account belongs to, read on demand. Our GitHub App sees
 * only the organizations it is installed on, so the card always offers to install it.
 */
export function GithubOrganizations({
	organizationId,
}: {
	organizationId: string;
}) {
	const { t } = useTranslation("home");
	const [load, { data, loading, error, called }] =
		useGithubOrganizationsLazyQuery({
			fetchPolicy: "network-only",
		});
	const organizations = data?.githubOrganizations ?? [];
	const installUrl = useGithubAppInstallUrlQuery().data?.githubAppInstallUrl;

	return (
		<div className="provider-read" data-testid="github-organizations">
			<button
				type="button"
				disabled={loading}
				data-testid="github-organizations-load"
				onClick={() => void load({ variables: { organizationId } })}
			>
				{t("integrations.github.load")}
			</button>
			{error ? (
				<p role="alert" data-testid="github-organizations-error">
					{t("integrations.readFailed")}
				</p>
			) : null}
			{installUrl ? (
				<a href={installUrl} data-testid="github-app-install">
					{t("integrations.github.install")}
				</a>
			) : null}
			{called && !loading && !error && organizations.length === 0 ? (
				<p data-testid="github-organizations-empty">
					{installUrl
						? t("integrations.github.emptyNotInstalled")
						: t("integrations.github.empty")}
				</p>
			) : null}
			{organizations.length > 0 ? (
				<ul data-testid="github-organizations-items">
					{organizations.map((entry) => (
						<li key={entry.id}>
							<strong>{entry.login}</strong>
							{entry.description ? (
								<span className="muted"> {entry.description}</span>
							) : null}
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
}
