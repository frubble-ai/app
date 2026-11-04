import {
	GithubRepositorySelection,
	useGithubAppInstallUrlQuery,
	useGithubInstallationsQuery,
} from "@frubble/react-sdk";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { RepositoryList } from "./repository-list";

/**
 * GitHub once connected. Our GitHub App reads only what it is installed on, so the card first
 * asks where it is installed: nowhere, and it offers the install alone; somewhere, and it says
 * where and lists the repositories on demand.
 */
export function GithubRepositories({
	organizationId,
}: {
	organizationId: string;
}) {
	const { t } = useTranslation("home");
	const installUrl = useGithubAppInstallUrlQuery().data?.githubAppInstallUrl;
	const { data, loading, error } = useGithubInstallationsQuery({
		variables: { organizationId },
		fetchPolicy: "network-only",
	});
	const installations = data?.githubInstallations ?? [];
	const card = (children: ReactNode) => (
		<div className="provider-read" data-testid="github-repositories">
			{children}
		</div>
	);
	const installLink = (label: string) =>
		installUrl ? (
			<a href={installUrl} data-testid="github-app-install">
				{label}
			</a>
		) : null;

	if (loading) {
		return card(
			<p className="muted" data-testid="github-installations-checking">
				{t("integrations.github.checking")}
			</p>,
		);
	}
	if (error) {
		return card(
			<p role="alert" data-testid="github-installations-error">
				{t("integrations.readFailed")}
			</p>,
		);
	}
	if (installations.length === 0) {
		return card(
			<>
				<p data-testid="github-installations-none">
					{t("integrations.github.notInstalled")}
				</p>
				{installLink(t("integrations.github.install"))}
			</>,
		);
	}
	const accounts = installations
		.map((installation) =>
			t(
				installation.repositories === GithubRepositorySelection.All
					? "integrations.github.allRepositories"
					: "integrations.github.selectedRepositories",
				{ account: installation.account },
			),
		)
		.join(", ");
	return card(
		<>
			<p data-testid="github-installations">
				{t("integrations.github.installedOn", { accounts })}
			</p>
			{installLink(t("integrations.github.change"))}
			<RepositoryList organizationId={organizationId} />
		</>,
	);
}
