import { githubListInstallations } from "@frubble-ai/osiris-client";
import type { TGithubInstallation } from "@/integrations";
import { answer } from "@/osiris/lib/answer";
import type { TOsiris } from "@/osiris/lib/client";

/** `github.list_installations`, in our types. */
export async function listGithubInstallations(
	osiris: TOsiris,
	accountRef: string,
): Promise<TGithubInstallation[]> {
	const { data } = answer(
		await githubListInstallations({ client: osiris, path: { id: accountRef } }),
	);
	return data.map((installation) => ({
		id: installation.id,
		account: installation.account,
		accountType: installation.account_type,
		repositories: installation.repository_selection,
	}));
}
