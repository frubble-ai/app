import { OrganizationRole, useAuth } from "@frubble/react-sdk";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LoadingState } from "@/shared/components/loading-state";
import { PageHead } from "@/shared/components/page-head";
import { CreateOrganization } from "./components/create-organization";
import { IntegrationsPanel } from "./components/integrations-panel";
import { MembersPanel } from "./components/members-panel";
import { useCurrentOrganization } from "./hooks/use-current-organization";

const OUTCOMES = ["connected", "pending", "failed"] as const;

/** What the API's callback said about a connect attempt (`?integration_status=`), if anything. */
function connectOutcome(params: URLSearchParams) {
	const status = params.get("integration_status");
	return OUTCOMES.find((outcome) => outcome === status) ?? null;
}

/** Where a signed-in user lands: their organization, its connected tools and its people. */
export function HomeScreen() {
	const { t } = useTranslation("home");
	const { user } = useAuth();
	const searchParams = useSearchParams();
	const outcome = connectOutcome(searchParams);
	const { organizations, current, loading, refetch, choose } =
		useCurrentOrganization();
	const [creating, setCreating] = useState(false);

	async function created(id: string) {
		choose(id);
		setCreating(false);
		await refetch();
	}

	const canManage =
		current?.role === OrganizationRole.Owner ||
		current?.role === OrganizationRole.Admin;

	return (
		<div data-testid="home">
			<PageHead
				title={t("title", { name: user?.name ?? "" })}
				description={t("description")}
			/>
			{outcome ? (
				<p role="status" data-testid={`connect-outcome-${outcome}`}>
					{t(`integrations.outcome.${outcome}`)}
				</p>
			) : null}
			{loading ? <LoadingState /> : null}
			{!loading && !current ? (
				<section data-testid="no-organization">
					<h2>{t("organizations.firstTitle")}</h2>
					<p>{t("organizations.firstDescription")}</p>
					<CreateOrganization onCreated={(id) => void created(id)} />
				</section>
			) : null}
			{current ? (
				<>
					<section className="toolbar" data-testid="organization">
						<label>
							{t("organizations.current")}
							<select
								value={current.id}
								onChange={(event) => choose(event.target.value)}
								data-testid="organization-picker"
							>
								{organizations.map((entry) => (
									<option key={entry.id} value={entry.id}>
										{entry.name}
									</option>
								))}
							</select>
						</label>
						{creating ? (
							<CreateOrganization onCreated={(id) => void created(id)} />
						) : (
							<button
								type="button"
								onClick={() => setCreating(true)}
								data-testid="organization-new"
							>
								{t("organizations.new")}
							</button>
						)}
					</section>
					<IntegrationsPanel
						key={`integrations-${current.id}`}
						organizationId={current.id}
						canManage={canManage}
					/>
					<MembersPanel
						key={`members-${current.id}`}
						organizationId={current.id}
						canManage={canManage}
					/>
				</>
			) : null}
		</div>
	);
}
