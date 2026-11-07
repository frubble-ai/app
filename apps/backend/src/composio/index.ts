import type { TIntegrationProvider } from "@frubble/db";
import {
	INTEGRATION_ACTION_PROVIDERS,
	type TConnectionBroker,
	type TIntegrationAction,
	type TIntegrationActions,
} from "@/integrations";
import { listGithubInstallations, listGithubRepositories } from "./github";
import { accountState, isAlreadyGone } from "./lib/account-state";
import { accountsByAlias } from "./lib/accounts-by-alias";
import { createComposio } from "./lib/client";
import type { TRunContext } from "./lib/run-context";
import { openSession } from "./lib/session";
import { listLinearTeams } from "./linear";
import { listSlackChannels } from "./slack";

/** Composio's toolkit for each provider. */
const TOOLKITS: Record<TIntegrationProvider, string> = {
	github: "github",
	linear: "linear",
	slack: "slack",
};

/**
 * Each action as Composio runs it, read into our output: one of its tools in a session, or the
 * provider's own endpoint through its proxy where no current tool covers it.
 */
const ACTIONS: {
	[TAction in TIntegrationAction]: (
		run: TRunContext,
		input: TIntegrationActions[TAction]["input"],
	) => Promise<TIntegrationActions[TAction]["output"]>;
} = {
	"github.listInstallations": listGithubInstallations,
	"github.listRepositories": listGithubRepositories,
	"linear.listTeams": listLinearTeams,
	"slack.listChannels": listSlackChannels,
};

/**
 * Composio as a broker: each organization is a Composio user, each connection a connected account
 * on our own OAuth app (an auth config per provider), each action one of its tools run in a
 * session. No telemetry and no npm version check.
 */
export function createComposioBroker(config: {
	apiKey: string;
	/** The auth config (our OAuth app at Composio) per provider. */
	authConfigIds: Record<TIntegrationProvider, string>;
	/** The most pages one list reads through the proxy. */
	proxyMaxPages: number;
}): TConnectionBroker {
	const composio = createComposio(config.apiKey);
	return {
		async startConnect(args) {
			// Straight to the provider's consent for our OAuth app: `initiate` with an unshortened
			// URL, Composio's app-owned path for custom auth configs, so no Composio page is shown.
			// The attempt id is the account's alias, which `findAccountsByAttempt` looks for.
			const request = await composio.connectedAccounts.initiate(
				args.organizationId,
				config.authConfigIds[args.provider],
				{
					callbackUrl: args.callbackUrl,
					allowMultiple: true,
					alias: args.attemptId,
					config: {
						authScheme: "OAUTH2",
						val: { status: "INITIALIZING", long_redirect_url: true },
					},
				},
			);
			return {
				accountRef: request.id,
				redirectUrl: request.redirectUrl ?? undefined,
			};
		},

		async accountState(accountRef, options = {}) {
			// Aborting also stops the SDK's own retries.
			const account = await composio.connectedAccounts.get(accountRef, {
				signal: options.signal,
			});
			return accountState(account.status);
		},

		async removeAccount(accountRef) {
			await composio.connectedAccounts
				.delete(accountRef)
				.catch((err: unknown) => {
					if (!isAlreadyGone(err)) throw err;
				});
		},

		findAccountsByAttempt(args) {
			return accountsByAlias(composio, {
				organizationId: args.organizationId,
				provider: TOOLKITS[args.provider],
				alias: args.attemptId,
			});
		},

		async run(action, connection, input) {
			const provider = INTEGRATION_ACTION_PROVIDERS[action];
			return ACTIONS[action](
				{
					composio,
					organizationId: connection.organizationId,
					connectedAccountId: connection.accountRef,
					proxyMaxPages: config.proxyMaxPages,
					session: () =>
						openSession(composio, {
							organizationId: connection.organizationId,
							toolkit: TOOLKITS[provider],
							authConfigId: config.authConfigIds[provider],
							connectedAccountId: connection.accountRef,
						}),
				},
				input,
			);
		},
	};
}
