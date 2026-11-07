import { faker } from "@faker-js/faker";
import type { TGithubInstallation } from "@/integrations";

/** Where our GitHub App is installed, as a broker's `github.listInstallations` gives it. */
export function generateGithubInstallation(
	overrides: Partial<TGithubInstallation> = {},
): TGithubInstallation {
	return {
		id: String(faker.number.int({ min: 1, max: 1_000_000_000 })),
		account: faker.internet.username().toLowerCase(),
		account_type: faker.helpers.arrayElement(["user", "organization"]),
		repository_selection: faker.helpers.arrayElement(["all", "selected"]),
		...overrides,
	};
}
