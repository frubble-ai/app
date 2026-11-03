import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { generateComposioConnectedAccount } from "./generate-composio-connected-account";
import { generateComposioSession } from "./generate-composio-session";
import type { generateComposioTool } from "./generate-composio-tool";

// Composio's API faked at the network: the real SDK and the real code run, only the HTTP answers
// are the test's.

const API = "https://backend.composio.dev/api/v3.1";

/** Every request the SDK sent, in order, with its JSON body. */
export const composioRequests: Array<{
	method: string;
	path: string;
	body: unknown;
}> = [];

export const composioNetwork = setupServer(
	http.delete(`${API}/connected_accounts/:id`, () =>
		HttpResponse.json({ success: true }),
	),
	http.post(`${API}/tool_router/session`, async ({ request }) => {
		const body = (await request.json()) as { user_id: string };
		return HttpResponse.json(generateComposioSession(body.user_id), {
			status: 201,
		});
	}),
);

composioNetwork.events.on("request:start", async ({ request }) => {
	const text = request.method === "GET" ? "" : await request.clone().text();
	composioRequests.push({
		method: request.method,
		path: new URL(request.url).pathname,
		body: text ? JSON.parse(text) : null,
	});
});

/**
 * `session.authorize` answers this account and consent page, once. `before` runs while Composio
 * is "creating" the account, for races.
 */
export function answerAuthorize(answer: {
	connectedAccountId: string;
	redirectUrl: string | null;
	before?: () => Promise<void>;
}) {
	composioNetwork.use(
		http.post(
			`${API}/tool_router/session/:id/link`,
			async () => {
				await answer.before?.();
				return HttpResponse.json({
					link_token: "lt_test",
					redirect_url: answer.redirectUrl,
					connected_account_id: answer.connectedAccountId,
				});
			},
			{ once: true },
		),
	);
}

/** The callback URL the last `session.authorize` sent Composio. */
export function lastCallbackUrl(): string {
	const link = composioRequests.findLast((entry) =>
		entry.path.endsWith("/link"),
	);
	return (
		(link?.body as { callback_url?: string } | undefined)?.callback_url ?? ""
	);
}

/** `session.execute` of `slug` answers `data`, or fails. */
export function answerExecute(
	slug: string,
	answer: { data: unknown } | { failed: string },
) {
	composioNetwork.use(
		http.post(`${API}/tool_router/session/:id/execute`, async ({ request }) => {
			const body = (await request.clone().json()) as { tool_slug?: string };
			if (body.tool_slug !== slug) return;
			return HttpResponse.json(
				"data" in answer
					? {
							data: answer.data,
							error: null,
							log_id: "log_test",
							result_type: "completed",
						}
					: {
							data: {},
							error: answer.failed,
							log_id: "log_test",
							result_type: "failed",
						},
			);
		}),
	);
}

/** `connectedAccounts.get` answers the account with `status` (every time, or `once`). */
export function answerConnectedAccount(
	connectedAccountId: string,
	status: "INITIATED" | "ACTIVE" | "FAILED",
	options: { once?: boolean } = {},
) {
	composioNetwork.use(
		http.get(
			`${API}/connected_accounts/${connectedAccountId}`,
			() =>
				HttpResponse.json(
					generateComposioConnectedAccount(connectedAccountId, status),
				),
			options,
		),
	);
}

/** `connectedAccounts.get` fails once, as Composio would when unreachable. */
export function failConnectedAccount(connectedAccountId: string) {
	composioNetwork.use(
		http.get(
			`${API}/connected_accounts/${connectedAccountId}`,
			() => HttpResponse.json({ error: "unavailable" }, { status: 503 }),
			{ once: true },
		),
	);
}

/**
 * `connectedAccounts.delete` fails until `restoreDelete`, as Composio would while down. The SDK
 * retries a failure itself, so a single failed answer would not reach our code.
 */
export function failDelete() {
	composioNetwork.use(
		http.delete(`${API}/connected_accounts/:id`, () =>
			HttpResponse.json({ error: "down" }, { status: 503 }),
		),
	);
}

/** `connectedAccounts.delete` works again after `failDelete`. */
export function restoreDelete() {
	composioNetwork.use(
		http.delete(`${API}/connected_accounts/:id`, () =>
			HttpResponse.json({ success: true }),
		),
	);
}

/** The ids of the accounts the SDK asked Composio to delete. */
export function deletedAccounts(): string[] {
	return composioRequests
		.filter((entry) => entry.method === "DELETE")
		.map((entry) => entry.path.split("/").pop() ?? "");
}

/** `getRawComposioToolBySlug` answers this tool (see `generateComposioTool`). */
export function answerTool(tool: ReturnType<typeof generateComposioTool>) {
	composioNetwork.use(
		http.get(`${API}/tools/${tool.slug}`, () => HttpResponse.json(tool)),
	);
}

/** Opening a session fails, as Composio would when down. */
export function failSessions() {
	composioNetwork.use(
		http.post(`${API}/tool_router/session`, () =>
			HttpResponse.json({ error: "down" }, { status: 400 }),
		),
	);
}
