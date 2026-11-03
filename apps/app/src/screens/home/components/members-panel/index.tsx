import {
	InvitationRole,
	useInviteOrganizationMemberMutation,
	useOrganizationQuery,
} from "@frubble/react-sdk";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { graphqlErrorMessage } from "@/shared/graphql-error";

/** Who is in the organization and who is invited; managers invite by email. */
export function MembersPanel({
	organizationId,
	canManage,
}: {
	organizationId: string;
	canManage: boolean;
}) {
	const { t } = useTranslation("home");
	const { data, refetch } = useOrganizationQuery({
		variables: { id: organizationId },
	});
	const [invite, { loading }] = useInviteOrganizationMemberMutation();
	const [error, setError] = useState<string | null>(null);
	const [sentTo, setSentTo] = useState<string | null>(null);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const formElement = event.currentTarget;
		const form = new FormData(formElement);
		const email = String(form.get("email") ?? "");
		setError(null);
		setSentTo(null);
		try {
			await invite({
				variables: {
					input: {
						organizationId,
						email,
						role:
							form.get("role") === InvitationRole.Admin
								? InvitationRole.Admin
								: InvitationRole.Member,
					},
				},
			});
			setSentTo(email);
			formElement.reset();
			await refetch();
		} catch (caught) {
			setError(graphqlErrorMessage(caught) ?? t("members.inviteFailed"));
		}
	}

	const organization = data?.organization;
	return (
		<section data-testid="members">
			<h2>{t("members.title")}</h2>
			<ul data-testid="members-list">
				{(organization?.members ?? []).map((entry) => (
					<li key={entry.userId}>
						{entry.name} ({entry.email}) ·{" "}
						{t(`roles.${entry.role}` as "roles.OWNER")}
					</li>
				))}
			</ul>
			{(organization?.invitations ?? []).length > 0 ? (
				<>
					<h3>{t("members.invited")}</h3>
					<ul data-testid="invitations-list">
						{organization?.invitations.map((entry) => (
							<li key={entry.id}>
								{entry.email} · {t(`roles.${entry.role}` as "roles.OWNER")}
							</li>
						))}
					</ul>
				</>
			) : null}
			{canManage ? (
				<form data-testid="invite-member" onSubmit={submit}>
					<label>
						{t("members.emailLabel")}
						<input
							name="email"
							type="email"
							required
							data-testid="invite-member-email"
						/>
					</label>
					<label>
						{t("members.roleLabel")}
						<select
							name="role"
							defaultValue={InvitationRole.Member}
							data-testid="invite-member-role"
						>
							<option value={InvitationRole.Member}>{t("roles.MEMBER")}</option>
							<option value={InvitationRole.Admin}>{t("roles.ADMIN")}</option>
						</select>
					</label>
					{error ? (
						<p role="alert" data-testid="invite-member-error">
							{error}
						</p>
					) : null}
					{sentTo ? (
						<p role="status" data-testid="invite-member-sent">
							{t("members.sent")}
						</p>
					) : null}
					<button
						type="submit"
						disabled={loading}
						data-testid="invite-member-submit"
					>
						{t("members.invite")}
					</button>
				</form>
			) : null}
		</section>
	);
}
