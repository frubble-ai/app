import type { TGithubRepository } from "@/integrations";

/** A repository in the schema's terms. */
export function toGqlRepository(repository: TGithubRepository) {
	return {
		id: repository.id,
		fullName: repository.full_name,
		isPrivate: repository.private,
		url: repository.url,
		description: repository.description ?? null,
	};
}
