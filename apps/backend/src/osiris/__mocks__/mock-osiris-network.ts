import { faker } from "@faker-js/faker";
import { delay, HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";

const OSIRIS = "http://osiris.test";

type TAccount = {
	id: string;
	user_id: string;
	provider: string;
	alias: string | null;
	status: "pending" | "active" | "expired" | "failed";
};

/** What the fake osiris holds and answers: the test arranges it. */
const state = {
	accounts: new Map<string, TAccount>(),
	hanging: new Set<string>(),
	nextRedirect: undefined as string | undefined,
	loseNext: false,
	actions: new Map<string, unknown[]>(),
	/** Deletes that osiris refuses, by account, with this status. */
	failedDeletes: new Map<string, number>(),
	/** Actions that osiris refuses, by name, with this status. */
	failedActions: new Map<string, number>(),
	requests: [] as Array<{
		method: string;
		path: string;
		headers: Headers;
		body: unknown;
	}>,
};

function account(id: string) {
	const found = state.accounts.get(id);
	if (!found) return undefined;
	const now = new Date().toISOString();
	return {
		...found,
		auth_config_id: "ac_test",
		scope: null,
		access_token_expires_at: null,
		last_error: null,
		setup_complete: found.status === "active",
		refresh_task: null,
		refresh_task_at: null,
		created_at: now,
		updated_at: now,
	};
}

function refused(status: number) {
	return HttpResponse.json(
		{ error: { code: "OS_99", type: "internal", message: "refused" } },
		{ status },
	);
}

function notFound() {
	return HttpResponse.json(
		{
			error: {
				code: "OS_01",
				type: "not_found",
				message: "connected account not found",
			},
		},
		{ status: 404 },
	);
}

const providerOfAuthConfig: Record<string, string> = {
	ac_test_github: "github",
	ac_test_linear: "linear",
	ac_test_slack: "slack",
};

const osirisNetwork = setupServer(
	http.post(`${OSIRIS}/v1/connected-accounts`, async ({ request }) => {
		const body = (await request.clone().json()) as {
			auth_config_id: string;
			user_id: string;
			alias?: string;
		};
		state.requests.push({
			method: "POST",
			path: "/v1/connected-accounts",
			headers: request.headers,
			body,
		});
		const id = `ca_${faker.string.alphanumeric(24)}`;
		state.accounts.set(id, {
			id,
			user_id: body.user_id,
			provider: providerOfAuthConfig[body.auth_config_id] ?? "github",
			alias: body.alias ?? null,
			status: "pending",
		});
		if (state.loseNext) {
			state.loseNext = false;
			return HttpResponse.json(
				{ error: { code: "OS_99", type: "internal", message: "lost" } },
				{ status: 500 },
			);
		}
		return HttpResponse.json(
			{
				id,
				status: "pending",
				redirect_url: state.nextRedirect ?? faker.internet.url(),
			},
			{ status: 201 },
		);
	}),
	http.get(`${OSIRIS}/v1/connected-accounts/:id`, async ({ params }) => {
		const id = String(params.id);
		if (state.hanging.has(id)) await delay("infinite");
		return account(id) ? HttpResponse.json(account(id)) : notFound();
	}),
	http.delete(`${OSIRIS}/v1/connected-accounts/:id`, ({ params }) => {
		const id = String(params.id);
		const failed = state.failedDeletes.get(id);
		if (failed !== undefined) return refused(failed);
		if (!state.accounts.delete(id)) return notFound();
		return HttpResponse.json({ id, deleted: true });
	}),
	http.get(`${OSIRIS}/v1/connected-accounts`, ({ request }) => {
		const query = new URL(request.url).searchParams;
		const data = [...state.accounts.values()]
			.filter(
				(found) => (query.get("user_id") ?? found.user_id) === found.user_id,
			)
			.filter(
				(found) => (query.get("provider") ?? found.provider) === found.provider,
			)
			.filter((found) => (query.get("alias") ?? found.alias) === found.alias)
			.map((found) => account(found.id));
		return HttpResponse.json({
			data,
			next_cursor: null,
			previous_cursor: null,
		});
	}),
	http.post(
		`${OSIRIS}/v1/connected-accounts/:id/actions/:action`,
		({ params, request }) => {
			state.requests.push({
				method: "POST",
				path: `/actions/${String(params.action)}`,
				headers: request.headers,
				body: null,
			});
			if (!state.accounts.has(String(params.id))) return notFound();
			const failed = state.failedActions.get(String(params.action));
			if (failed !== undefined) return refused(failed);
			return HttpResponse.json({
				data: state.actions.get(String(params.action)) ?? [],
			});
		},
	),
);

/** Registers the fake osiris for a test file: a request it doesn't answer fails the test. */
export function setupOsirisNetwork() {
	beforeAll(() => osirisNetwork.listen({ onUnhandledFrame: "error" }));
	afterEach(() => {
		state.accounts.clear();
		state.hanging.clear();
		state.actions.clear();
		state.failedDeletes.clear();
		state.failedActions.clear();
		state.requests.length = 0;
		state.nextRedirect = undefined;
		state.loseNext = false;
	});
	afterAll(() => osirisNetwork.close());
}

export const osiris = {
	/** The next connect opens `redirectUrl`. */
	answerConnect(redirectUrl: string) {
		state.nextRedirect = redirectUrl;
	},
	/** The next connect's answer is lost after osiris made the account. */
	loseConnect() {
		state.loseNext = true;
	},
	setStatus(id: string, status: TAccount["status"]) {
		const found = state.accounts.get(id);
		if (found) found.status = status;
	},
	hang(id: string) {
		state.hanging.add(id);
	},
	removedElsewhere(id: string) {
		state.accounts.delete(id);
	},
	/** The account the last connect made. */
	lastAccountId() {
		return [...state.accounts.keys()].at(-1) ?? "";
	},
	answerAction(action: string, data: unknown[]) {
		state.actions.set(action, data);
	},
	/** Osiris refuses to delete the account with `status`. */
	failDelete(id: string, status: number) {
		state.failedDeletes.set(id, status);
	},
	/** Osiris refuses `action` with `status`. */
	failAction(action: string, status: number) {
		state.failedActions.set(action, status);
	},
	requests: () => state.requests,
};
