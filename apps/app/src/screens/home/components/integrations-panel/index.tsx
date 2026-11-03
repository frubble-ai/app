import {
	type IntegrationProvider,
	useDisconnectIntegrationMutation,
	useIntegrationsQuery,
	useStartIntegrationConnectMutation,
} from "@frubble/react-sdk";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IntegrationPreview } from "@/screens/home/components/integration-preview";
import { PROVIDERS, providerSlug } from "@/screens/home/lib/providers";

/** Each provider: connected or not, connect and disconnect for managers, a preview once connected. */
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
			<ul>
				{PROVIDERS.map((provider) => {
					const slug = providerSlug(provider);
					const isConnected = connected.has(provider);
					return (
						<li key={provider} data-testid={`integration-${slug}`}>
							<strong>
								{t(`integrations.names.${slug}` as "integrations.names.github")}
							</strong>{" "}
							<span data-testid={`integration-status-${slug}`}>
								{loading
									? t("integrations.checking")
									: isConnected
										? t("integrations.connected")
										: t("integrations.notConnected")}
							</span>
							{canManage ? (
								<>
									{" "}
									<button
										type="button"
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
											disabled={busy !== null}
											data-testid={`integration-disconnect-${slug}`}
											onClick={() => void remove(provider)}
										>
											{t("integrations.disconnect")}
										</button>
									) : null}
								</>
							) : null}
							{isConnected ? (
								<IntegrationPreview
									organizationId={organizationId}
									provider={provider}
								/>
							) : null}
						</li>
					);
				})}
			</ul>
		</section>
	);
}
