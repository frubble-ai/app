import { githubListRepositories } from "@frubble-ai/osiris-client";
import type { TGithubRepository } from "@/integrations";
import { answer } from "@/osiris/lib/answer";
import type { TOsiris } from "@/osiris/lib/client";

/** `github.list_repositories`, in our types. */
export async function listGithubRepositories(
	osiris: TOsiris,
	accountRef: string,
): Promise<TGithubRepository[]> {
	const { data } = answer(
		await githubListRepositories({ client: osiris, path: { id: accountRef } }),
	);
	return data.map((repository) => ({
		id: repository.id,
		fullName: repository.full_name,
		isPrivate: repository.private,
		url: repository.url,
		description: repository.description ?? null,
	}));
}
