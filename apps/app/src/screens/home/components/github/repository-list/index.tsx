import { useGithubRepositoriesLazyQuery } from "@frubble/react-sdk";
import { useTranslation } from "react-i18next";

/** The repositories our installed GitHub App reads, listed on demand. */
export function RepositoryList({ organizationId }: { organizationId: string }) {
	const { t } = useTranslation("home");
	const [load, { data, loading, error, called }] =
		useGithubRepositoriesLazyQuery({ fetchPolicy: "network-only" });
	const repositories = data?.githubRepositories ?? [];

	return (
		<>
			<button
				type="button"
				disabled={loading}
				data-testid="github-repositories-load"
				onClick={() => void load({ variables: { organizationId } })}
			>
				{t("integrations.github.load")}
			</button>
			{error ? (
				<p role="alert" data-testid="github-repositories-error">
					{t("integrations.readFailed")}
				</p>
			) : null}
			{called && !loading && !error && repositories.length === 0 ? (
				<p data-testid="github-repositories-empty">
					{t("integrations.github.empty")}
				</p>
			) : null}
			{repositories.length > 0 ? (
				<ul data-testid="github-repositories-items">
					{repositories.map((repository) => (
						<li key={repository.id}>
							<a href={repository.url}>
								<strong>{repository.fullName}</strong>
							</a>
							{repository.isPrivate ? (
								<span className="muted">
									{" "}
									{t("integrations.github.private")}
								</span>
							) : null}
							{repository.description ? (
								<span className="muted"> {repository.description}</span>
							) : null}
						</li>
					))}
				</ul>
			) : null}
		</>
	);
}
