import { faker } from "@faker-js/faker";
import type { TGithubOrganization } from "@/integrations";

/** A GitHub organization as a broker's `github.listOrganizations` gives it. */
export function generateGithubOrganization(
	overrides: Partial<TGithubOrganization> = {},
): TGithubOrganization {
	return {
		id: String(faker.number.int({ min: 1, max: 1_000_000_000 })),
		login: faker.internet.username().toLowerCase(),
		description: faker.helpers.arrayElement([
			null,
			faker.company.catchPhrase(),
		]),
		avatarUrl: faker.image.avatar(),
		...overrides,
	};
}
