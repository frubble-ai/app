import {
	GithubAccountType,
	GithubRepositorySelection,
} from "@frubble/gql/types";
import { describe, expect, it } from "vitest";
import { toGqlInstallation } from "@/services/api/graphql/github/lib/installations";
import { generateGithubInstallation } from "@/shared/__mocks__/generate-github-installation";

describe("toGqlInstallation", () => {
	it.each([
		{
			accountType: "user",
			selection: "all",
			expected: [GithubAccountType.User, GithubRepositorySelection.All],
		},
		{
			accountType: "organization",
			selection: "selected",
			expected: [
				GithubAccountType.Organization,
				GithubRepositorySelection.Selected,
			],
		},
	] as const)(
		"turns a $accountType installation with $selection repositories into the schema's",
		({ accountType, selection, expected }) => {
			const installation = generateGithubInstallation({
				account_type: accountType,
				repository_selection: selection,
			});

			expect(toGqlInstallation(installation)).toEqual({
				id: installation.id,
				account: installation.account,
				accountType: expected[0],
				repositories: expected[1],
			});
		},
	);
});
