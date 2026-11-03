import { useCreateOrganizationMutation } from "@frubble/react-sdk";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";

/** Name a new organization; the caller becomes its owner. */
export function CreateOrganization({
	onCreated,
}: {
	onCreated: (id: string) => void;
}) {
	const { t } = useTranslation("home");
	const [createOrganization, { loading }] = useCreateOrganizationMutation();
	const [failed, setFailed] = useState(false);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const name = String(new FormData(event.currentTarget).get("name") ?? "");
		setFailed(false);
		try {
			const { data } = await createOrganization({
				variables: { input: { name } },
			});
			if (data) onCreated(data.createOrganization.id);
		} catch {
			setFailed(true);
		}
	}

	return (
		<form data-testid="create-organization" onSubmit={submit}>
			<label>
				{t("organizations.nameLabel")}
				<input
					name="name"
					required
					maxLength={80}
					data-testid="create-organization-name"
				/>
			</label>
			{failed ? (
				<p role="alert" data-testid="create-organization-error">
					{t("organizations.createFailed")}
				</p>
			) : null}
			<button
				type="submit"
				disabled={loading}
				data-testid="create-organization-submit"
			>
				{t("organizations.create")}
			</button>
		</form>
	);
}
