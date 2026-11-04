import type { TIntegrationBroker, TIntegrationProvider } from "@frubble/db";

// What the use cases need from whoever holds the organizations' grants (a broker), in our terms.
// Each broker implements TConnectionBroker in its own folder (`src/composio/`); nothing here or in
// the use cases knows which one it is.

/** Where a broker's account stands: consent still open, live, or failed. */
export type TAccountState = "pending" | "active" | "failed";

/** An organization's account at its broker, for one provider. */
export type TConnectionRef = {
	organizationId: string;
	provider: TIntegrationProvider;
	/** The broker's id for the account. */
	accountRef: string;
};

/** A GitHub organization the connected user belongs to. */
export type TGithubOrganization = {
	id: string;
	login: string;
	description: string | null;
	avatarUrl: string;
};

/** A Linear team the connected user can see. */
export type TLinearTeam = { id: string; name: string };

/** A Slack channel the connected user can see. */
export type TSlackChannel = {
	id: string;
	name: string;
	isPrivate: boolean;
	memberCount: number | null;
};

/** Every action a broker runs with a connection: our ids, our input and output. */
export type TIntegrationActions = {
	/** The organizations the connected GitHub user belongs to. */
	"github.listOrganizations": {
		input: Record<string, never>;
		output: TGithubOrganization[];
	};
	/** The Linear teams the connected user can see. */
	"linear.listTeams": { input: Record<string, never>; output: TLinearTeam[] };
	/** The workspace's channels the connected user can see, archived ones left out. */
	"slack.listChannels": {
		input: Record<string, never>;
		output: TSlackChannel[];
	};
};

export type TIntegrationAction = keyof TIntegrationActions;

/** Holds an organization's grants to providers and runs actions with them. */
export type TConnectionBroker = {
	/**
	 * Open the provider's consent for an organization. `attemptId` is ours and marks the account
	 * made for this attempt, so `findAccountsByAttempt` finds it when this answer is lost. The
	 * browser comes back to `callbackUrl`. No `redirectUrl`: there is nothing to send the user to.
	 */
	startConnect(args: {
		organizationId: string;
		provider: TIntegrationProvider;
		attemptId: string;
		callbackUrl: string;
	}): Promise<{ accountRef: string; redirectUrl: string | undefined }>;
	/** Where the account stands. Throws when the broker cannot say, or `signal` aborts first. */
	accountState(
		accountRef: string,
		options?: { signal?: AbortSignal },
	): Promise<TAccountState>;
	/** Remove the account. One already gone counts as removed. */
	removeAccount(accountRef: string): Promise<void>;
	/** The accounts made for an attempt whose answer to `startConnect` was lost. */
	findAccountsByAttempt(args: {
		organizationId: string;
		provider: TIntegrationProvider;
		attemptId: string;
	}): Promise<string[]>;
	/** Run one action with the connection; its output is checked, nothing unchecked comes back. */
	run<TAction extends TIntegrationAction>(
		action: TAction,
		connection: TConnectionRef,
		input: TIntegrationActions[TAction]["input"],
	): Promise<TIntegrationActions[TAction]["output"]>;
};

/** Every broker by its key, and the one new connections go through. */
export type TIntegrations = {
	brokers: Record<TIntegrationBroker, TConnectionBroker>;
	connectThrough: TIntegrationBroker;
};
