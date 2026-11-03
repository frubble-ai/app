import { useLinearTeamsLazyQuery } from "@frubble/react-sdk";
import { useTranslation } from "react-i18next";

/** The Linear teams the connected account can see, read on demand. */
export function LinearTeams({ organizationId }: { organizationId: string }) {
	const { t } = useTranslation("home");
	const [load, { data, loading, error, called }] = useLinearTeamsLazyQuery({
		fetchPolicy: "network-only",
	});
	const teams = data?.linearTeams ?? [];

	return (
		<div className="preview" data-testid="linear-teams">
			<button
				type="button"
				disabled={loading}
				data-testid="linear-teams-load"
				onClick={() => void load({ variables: { organizationId } })}
			>
				{t("integrations.linear.load")}
			</button>
			{error ? (
				<p role="alert" data-testid="linear-teams-error">
					{t("integrations.readFailed")}
				</p>
			) : null}
			{called && !loading && !error && teams.length === 0 ? (
				<p data-testid="linear-teams-empty">{t("integrations.linear.empty")}</p>
			) : null}
			{teams.length > 0 ? (
				<ul data-testid="linear-teams-items">
					{teams.map((team) => (
						<li key={team.id}>{team.name}</li>
					))}
				</ul>
			) : null}
		</div>
	);
}
