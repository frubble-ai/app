import { useSlackChannelsLazyQuery } from "@frubble/react-sdk";
import { useTranslation } from "react-i18next";

/** The Slack channels the connected account can see, read on demand. */
export function SlackChannels({ organizationId }: { organizationId: string }) {
	const { t } = useTranslation("home");
	const [load, { data, loading, error, called }] = useSlackChannelsLazyQuery({
		fetchPolicy: "network-only",
	});
	const channels = data?.slackChannels ?? [];

	return (
		<div className="provider-read" data-testid="slack-channels">
			<button
				type="button"
				disabled={loading}
				data-testid="slack-channels-load"
				onClick={() => void load({ variables: { organizationId } })}
			>
				{t("integrations.slack.load")}
			</button>
			{error ? (
				<p role="alert" data-testid="slack-channels-error">
					{t("integrations.readFailed")}
				</p>
			) : null}
			{called && !loading && !error && channels.length === 0 ? (
				<p data-testid="slack-channels-empty">
					{t("integrations.slack.empty")}
				</p>
			) : null}
			{channels.length > 0 ? (
				<ul data-testid="slack-channels-items">
					{channels.map((channel) => (
						<li key={channel.id}>
							#{channel.name}
							<span className="muted">
								{" "}
								{channel.isPrivate
									? t("integrations.slack.private")
									: t("integrations.slack.public")}
								{channel.memberCount === null ||
								channel.memberCount === undefined
									? null
									: ` · ${t("integrations.slack.members", { count: channel.memberCount })}`}
							</span>
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
}
