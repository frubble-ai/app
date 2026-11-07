import { faker } from "@faker-js/faker";
import type { TGithubRepository } from "@/integrations";

/** A repository as a broker's `github.listRepositories` gives it. */
export function generateGithubRepository(
	overrides: Partial<TGithubRepository> = {},
): TGithubRepository {
	const fullName = `${faker.internet.username().toLowerCase()}/${faker.helpers.slugify(faker.lorem.words(2)).toLowerCase()}`;
	return {
		id: String(faker.number.int({ min: 1, max: 1_000_000_000 })),
		full_name: fullName,
		private: faker.datatype.boolean(),
		url: `https://github.com/${fullName}`,
		description: faker.helpers.arrayElement([null, faker.lorem.sentence()]),
		...overrides,
	};
}
