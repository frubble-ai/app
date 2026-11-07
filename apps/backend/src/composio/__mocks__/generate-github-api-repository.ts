import { faker } from "@faker-js/faker";

/** One entry of GitHub's `GET /user/installations/{id}/repositories`, with fields we don't read too. */
export function generateGithubApiRepository(
	overrides: { id?: number; owner?: string } = {},
) {
	const owner = overrides.owner ?? faker.internet.username().toLowerCase();
	const name = faker.helpers.slugify(faker.lorem.words(2)).toLowerCase();
	return {
		id: overrides.id ?? faker.number.int({ min: 1, max: 1_000_000_000 }),
		name,
		full_name: `${owner}/${name}`,
		private: faker.datatype.boolean(),
		html_url: `https://github.com/${owner}/${name}`,
		description: faker.helpers.arrayElement([null, faker.lorem.sentence()]),
		default_branch: faker.git.branch(),
	};
}
