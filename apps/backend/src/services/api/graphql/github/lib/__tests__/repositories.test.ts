import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { toGqlRepository } from "@/services/api/graphql/github/lib/repositories";
import { generateGithubRepository } from "@/shared/__mocks__/generate-github-repository";

describe("toGqlRepository", () => {
	it("turns a repository into the schema's", () => {
		const repository = generateGithubRepository({
			description: faker.lorem.sentence(),
		});

		expect(toGqlRepository(repository)).toEqual({
			id: repository.id,
			fullName: repository.full_name,
			isPrivate: repository.private,
			url: repository.url,
			description: repository.description,
		});
	});

	it.each([
		{ label: "null", description: null },
		{ label: "absent", description: undefined },
	])("answers a $label description as null", ({ description }) => {
		const repository = generateGithubRepository({ description });

		expect(toGqlRepository(repository).description).toBeNull();
	});
});
