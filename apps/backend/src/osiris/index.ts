import {
	createConnectedAccount,
	deleteConnectedAccount,
	listConnectedAccounts,
	retrieveConnectedAccount,
} from "@frubble-ai/osiris-client";
import type { TOsirisConfig } from "@/config/integrations/osiris";
import type {
	TConnectionBroker,
	TIntegrationAction,
	TIntegrationActions,
} from "@/integrations";
import { listGithubInstallations } from "./github/list-installations";
import { listGithubRepositories } from "./github/list-repositories";
import { accountState } from "./lib/account-state";
import { answer, OsirisError } from "./lib/answer";
import { createOsiris, type TOsiris } from "./lib/client";
import { listLinearTeams } from "./linear/list-teams";
import { listSlackChannels } from "./slack/list-channels";

/** Each action as osiris runs it, read into our output. */
const ACTIONS: {
	[TAction in TIntegrationAction]: (
		osiris: TOsiris,
		accountRef: string,
	) => Promise<TIntegrationActions[TAction]["output"]>;
} = {
	"github.listInstallations": listGithubInstallations,
	"github.listRepositories": listGithubRepositories,
	"linear.listTeams": listLinearTeams,
	"slack.listChannels": listSlackChannels,
};

/**
 * Osiris as a broker (frubble-ai/osiris): each organization is an osiris user, each connection a
 * connected account on our own app (an auth config per provider), each action one of its typed
 * actions. Every answer is checked against osiris's own schema by its client.
 */
export function createOsirisBroker(config: TOsirisConfig): TConnectionBroker {
	const osiris = createOsiris(config);
	return {
		async startConnect(args) {
			// The attempt id is the alias `findAccountsByAttempt` looks for, and the idempotency
			// key: a retried start opens one consent, not two.
			const created = answer(
				await createConnectedAccount({
					client: osiris,
					body: {
						auth_config_id: config.authConfigIds[args.provider],
						user_id: args.organizationId,
						alias: args.attemptId,
						callback_url: args.callbackUrl,
					},
					headers: { "Idempotency-Key": args.attemptId },
				}),
			);
			return { accountRef: created.id, redirectUrl: created.redirect_url };
		},

		async accountState(accountRef, options = {}) {
			const account = answer(
				await retrieveConnectedAccount({
					client: osiris,
					path: { id: accountRef },
					signal: options.signal,
				}),
			);
			return accountState(
				account.status as "pending" | "active" | "expired" | "failed",
			);
		},

		async removeAccount(accountRef) {
			try {
				answer(
					await deleteConnectedAccount({
						client: osiris,
						path: { id: accountRef },
					}),
				);
			} catch (err) {
				// Gone already counts as removed.
				if (!(err instanceof OsirisError && err.status === 404)) throw err;
			}
		},

		async findAccountsByAttempt(args) {
			const found = answer(
				await listConnectedAccounts({
					client: osiris,
					query: {
						user_id: args.organizationId,
						provider: args.provider,
						alias: args.attemptId,
						limit: 100,
					},
				}),
			);
			return found.data.map((account) => account.id);
		},

		async run(action, connection) {
			return ACTIONS[action](osiris, connection.accountRef);
		},
	};
}
