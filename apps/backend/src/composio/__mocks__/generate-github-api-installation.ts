import { faker } from "@faker-js/faker";

/** One entry of GitHub's `GET /user/installations`, with the fields we read and a few we don't. */
export function generateGithubApiInstallation(
	overrides: {
		id?: number;
		login?: string;
		type?: "User" | "Organization";
		repository_selection?: "all" | "selected";
	} = {},
) {
	return {
		id: overrides.id ?? faker.number.int({ min: 1, max: 1_000_000_000 }),
		app_slug: "frubble-ai",
		account: {
			login: overrides.login ?? faker.internet.username().toLowerCase(),
			type:
				overrides.type ?? faker.helpers.arrayElement(["User", "Organization"]),
			avatar_url: faker.image.avatar(),
		},
		repository_selection:
			overrides.repository_selection ??
			faker.helpers.arrayElement(["all", "selected"]),
		permissions: { metadata: "read", members: "read" },
	};
}
