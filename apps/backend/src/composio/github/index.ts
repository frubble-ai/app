import { z } from "zod";
import { proxyGet } from "@/composio/lib/proxy-get";
import type { TRunContext } from "@/composio/lib/run-context";
import type { TGithubInstallation, TGithubRepository } from "@/integrations";

// Our GitHub App's user token answers for the app's installations, so these call GitHub's own
// endpoints for them (`/user/installations`), through Composio's proxy. Composio's tools for them
// live only in GitHub toolkit 20250911_00, which sessions no longer run and which stops working
// on 2027-01-29, and their output schemas are untyped; these schemas are ours, from GitHub's
// documented responses, with only the fields we read.

/** GitHub's page size limit. */
const PER_PAGE = 100;

const installationsSchema = z.object({
	total_count: z.number(),
	installations: z.array(
		z.object({
			id: z.number(),
			account: z.object({
				login: z.string(),
				type: z.enum(["User", "Organization", "Enterprise"]),
			}),
			repository_selection: z.enum(["all", "selected"]),
		}),
	),
});

const repositoriesSchema = z.object({
	total_count: z.number(),
	repositories: z.array(
		z.object({
			id: z.number(),
			full_name: z.string(),
			private: z.boolean(),
			html_url: z.string(),
			description: z.string().nullable(),
		}),
	),
});

/**
 * The pages of a GitHub list, until it holds `total_count` items, a page comes back short, or it
 * has read `run.proxyMaxPages` pages. At that cap the list holds only its first pages.
 */
async function allPages<TItem>(
	run: TRunContext,
	page: (number: number) => Promise<{ total: number; items: TItem[] }>,
): Promise<TItem[]> {
	const items: TItem[] = [];
	for (let number = 1; number <= run.proxyMaxPages; number += 1) {
		const next = await page(number);
		items.push(...next.items);
		if (next.items.length < PER_PAGE || items.length >= next.total) {
			break;
		}
	}
	return items;
}

async function installations(run: TRunContext) {
	return allPages(run, async (page) => {
		const data = await proxyGet(run, {
			endpoint: "/user/installations",
			query: { per_page: PER_PAGE, page },
			schema: installationsSchema,
		});
		return { total: data.total_count, items: data.installations };
	});
}

/** Where our GitHub App is installed, of what the connected user can see. */
export async function listGithubInstallations(
	run: TRunContext,
): Promise<TGithubInstallation[]> {
	return (await installations(run)).map((installation) => ({
		id: String(installation.id),
		account: installation.account.login,
		accountType: installation.account.type === "User" ? "user" : "organization",
		repositories: installation.repository_selection,
	}));
}

/** Every repository our GitHub App's installations give the connected user, each once. */
export async function listGithubRepositories(
	run: TRunContext,
): Promise<TGithubRepository[]> {
	// The installations are read together; each one's pages stay in order.
	const perInstallation = await Promise.all(
		(await installations(run)).map((installation) =>
			allPages(run, async (page) => {
				const data = await proxyGet(run, {
					endpoint: `/user/installations/${installation.id}/repositories`,
					query: { per_page: PER_PAGE, page },
					schema: repositoriesSchema,
				});
				return { total: data.total_count, items: data.repositories };
			}),
		),
	);
	const byId = new Map<number, TGithubRepository>();
	for (const repository of perInstallation.flat()) {
		byId.set(repository.id, {
			id: String(repository.id),
			fullName: repository.full_name,
			isPrivate: repository.private,
			url: repository.html_url,
			description: repository.description,
		});
	}
	return [...byId.values()];
}
