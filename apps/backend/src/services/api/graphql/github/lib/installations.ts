import {
	GithubAccountType,
	GithubRepositorySelection,
} from "@frubble/gql/types";
import type { TGithubInstallation } from "@/integrations";

const ACCOUNT_TYPES: Record<
	TGithubInstallation["account_type"],
	GithubAccountType
> = {
	user: GithubAccountType.User,
	organization: GithubAccountType.Organization,
};

const SELECTIONS: Record<
	TGithubInstallation["repository_selection"],
	GithubRepositorySelection
> = {
	all: GithubRepositorySelection.All,
	selected: GithubRepositorySelection.Selected,
};

/** An installation in the schema's terms. */
export function toGqlInstallation(installation: TGithubInstallation) {
	return {
		id: installation.id,
		account: installation.account,
		accountType: ACCOUNT_TYPES[installation.account_type],
		repositories: SELECTIONS[installation.repository_selection],
	};
}
