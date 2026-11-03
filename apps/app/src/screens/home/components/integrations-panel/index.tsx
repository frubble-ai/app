import {
	IntegrationProvider,
	useDisconnectIntegrationMutation,
	useIntegrationsQuery,
	useStartIntegrationConnectMutation,
} from "@frubble/react-sdk";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { GithubOrganizations } from "@/screens/home/components/github-organizations";
import { LinearTeams } from "@/screens/home/components/linear-teams";
import { SlackChannels } from "@/screens/home/components/slack-channels";
import { PROVIDERS, providerSlug } from "@/screens/home/lib/providers";

/** What a connected provider shows: its own read. */
const READS = {
	[IntegrationProvider.Github]: GithubOrganizations,
	[IntegrationProvider.Linear]: LinearTeams,
	[IntegrationProvider.Slack]: SlackChannels,
};

/** Each provider: connected or not, connect and disconnect for managers, its own read once connected. */
export function IntegrationsPanel({
	organizationId,
	canManage,
}: {
	organizationId: string;
	canManage: boolean;
}) {
	const { t } = useTranslation("home");
	const { data, loading, refetch } = useIntegrationsQuery({
		variables: { organizationId },
	});
	const [startConnect] = useStartIntegrationConnectMutation();
	const [disconnect] = useDisconnectIntegrationMutation();
	const [busy, setBusy] = useState<IntegrationProvider | null>(null);
	const [failed, setFailed] = useState(false);
	const connected = new Set(
		(data?.integrations ?? []).map((entry) => entry.provider),
	);

	async function connect(provider: IntegrationProvider) {
		setBusy(provider);
		setFailed(false);
		try {
			const result = await startConnect({
				variables: { input: { organizationId, provider } },
			});
			const url = result.data?.startIntegrationConnect.redirectUrl;
			if (url) window.location.assign(url);
		} catch {
			setFailed(true);
			setBusy(null);
		}
	}

	async function remove(provider: IntegrationProvider) {
		setBusy(provider);
		setFailed(false);
		try {
			await disconnect({ variables: { input: { organizationId, provider } } });
			await refetch();
		} catch {
			setFailed(true);
		} finally {
			setBusy(null);
		}
	}

	return (
		<section data-testid="integrations">
			<h2>{t("integrations.title")}</h2>
			{failed ? (
				<p role="alert" data-testid="integrations-error">
					{t("integrations.actionFailed")}
				</p>
			) : null}
			<ul className="rows">
				{PROVIDERS.map((provider) => {
					const slug = providerSlug(provider);
					const isConnected = connected.has(provider);
					return (
						<li key={provider} data-testid={`integration-${slug}`}>
							<div className="row">
								<strong>
									{t(
										`integrations.names.${slug}` as "integrations.names.github",
									)}
								</strong>
								<span
									className={isConnected ? "badge badge--on" : "badge"}
									data-testid={`integration-status-${slug}`}
								>
									{loading
										? t("integrations.checking")
										: isConnected
											? t("integrations.connected")
											: t("integrations.notConnected")}
								</span>
								{canManage ? (
									<div className="row__actions">
										<button
											type="button"
											className={isConnected ? undefined : "primary"}
											disabled={busy !== null}
											data-testid={`integration-connect-${slug}`}
											onClick={() => void connect(provider)}
										>
											{isConnected
												? t("integrations.reconnect")
												: t("integrations.connect")}
										</button>
										{isConnected ? (
											<button
												type="button"
												className="danger"
												disabled={busy !== null}
												data-testid={`integration-disconnect-${slug}`}
												onClick={() => void remove(provider)}
											>
												{t("integrations.disconnect")}
											</button>
										) : null}
									</div>
								) : null}
							</div>
							{isConnected
								? (() => {
										const Read = READS[provider];
										return <Read organizationId={organizationId} />;
									})()
								: null}
						</li>
					);
				})}
			</ul>
		</section>
	);
}
