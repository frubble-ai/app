import { useAcceptOrganizationInvitationMutation } from "@frubble/react-sdk";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHead } from "@/shared/components/page-head";
import { writeCurrentOrganizationId } from "@/shared/current-organization";
import { graphqlErrorCode } from "@/shared/graphql-error";

/** The page an invitation email links to: accept, then land in that organization. */
export function AcceptInvitationScreen() {
	const { t } = useTranslation("invitations");
	const { id } = useParams<{ id: string }>();
	const router = useRouter();
	// The home page's list must include the organization just joined, or it falls back to another.
	const [accept, { loading }] = useAcceptOrganizationInvitationMutation({
		refetchQueries: ["MyOrganizations"],
		awaitRefetchQueries: true,
	});
	const [failure, setFailure] = useState<"notYours" | "invalid" | null>(null);

	async function submit() {
		setFailure(null);
		try {
			const { data } = await accept({ variables: { invitationId: id } });
			if (data) {
				writeCurrentOrganizationId(
					data.acceptOrganizationInvitation.organizationId,
				);
				router.replace("/");
			}
		} catch (caught) {
			setFailure(
				graphqlErrorCode(caught) === "FORBIDDEN" ? "notYours" : "invalid",
			);
		}
	}

	return (
		<div data-testid="accept-invitation">
			<PageHead title={t("title")} description={t("description")} />
			{failure ? (
				<p role="alert" data-testid="accept-invitation-error">
					{t(`errors.${failure}`)}
				</p>
			) : null}
			<button
				type="button"
				disabled={loading}
				onClick={() => void submit()}
				data-testid="accept-invitation-submit"
			>
				{t("accept")}
			</button>
		</div>
	);
}
