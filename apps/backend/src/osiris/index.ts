import {
	createConnectedAccount,
	deleteConnectedAccount,
	githubListInstallations,
	githubListRepositories,
	linearListTeams,
	listConnectedAccounts,
	retrieveConnectedAccount,
	slackListChannels,
} from "@frubble-ai/osiris-client";
import type { TOsirisConfig } from "@/config/integrations/osiris";
import type {
	TConnectionBroker,
	TIntegrationAction,
	TIntegrationActions,
} from "@/integrations";
import { accountState } from "./lib/account-state";
import { answer, OsirisError } from "./lib/answer";
import { createOsiris, type TOsiris } from "./lib/client";

// The outputs of our actions, osiris's generated types (src/integrations/).
export type {
	GithubInstallation,
	GithubRepository,
	LinearTeam,
	SlackChannel,
} from "@frubble-ai/osiris-client";

/**
 * Each action as osiris's generated client calls it. Our outputs are osiris's own types, so its
 * answer comes back as it is, already checked against its schema by the client.
 */
const ACTIONS: {
	[TAction in TIntegrationAction]: (options: {
		client: TOsiris;
		path: { id: string };
	}) => Promise<{
		data?: { data: TIntegrationActions[TAction]["output"] };
		error?: unknown;
		response?: Response;
	}>;
} = {
	"github.listInstallations": githubListInstallations,
	"github.listRepositories": githubListRepositories,
	"linear.listTeams": linearListTeams,
	"slack.listChannels": slackListChannels,
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
			const call = ACTIONS[action];
			return answer(
				await call({ client: osiris, path: { id: connection.accountRef } }),
			).data;
		},
	};
}
