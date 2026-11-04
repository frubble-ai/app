import {
	GithubAccountType,
	GithubRepositorySelection,
} from "@frubble/gql/types";
import type { TGithubInstallation } from "@/integrations";

const ACCOUNT_TYPES: Record<
	TGithubInstallation["accountType"],
	GithubAccountType
> = {
	user: GithubAccountType.User,
	organization: GithubAccountType.Organization,
};

const SELECTIONS: Record<
	TGithubInstallation["repositories"],
	GithubRepositorySelection
> = {
	all: GithubRepositorySelection.All,
	selected: GithubRepositorySelection.Selected,
};

/** An installation in the schema's terms. */
export function toGqlInstallation(installation: TGithubInstallation) {
	return {
		...installation,
		accountType: ACCOUNT_TYPES[installation.accountType],
		repositories: SELECTIONS[installation.repositories],
	};
}
