import type { TIntegrationBroker, TIntegrationProvider } from "@frubble/db";
import type {
	GithubInstallation,
	GithubRepository,
	LinearTeam,
	SlackChannel,
} from "@/osiris";

// What the use cases need from whoever holds the organizations' grants (a broker). Each broker
// implements TConnectionBroker in its own folder (`src/composio/`, `src/osiris/`), and the use
// cases never know which one runs. The actions' outputs are named for what the use cases need and
// defined by us, in Osiris's OpenAPI spec (docs/style-guide/use-cases.md, "Third-party clients").

/** Where a broker's account stands: consent still open, live, or failed. */
export type TAccountState = "pending" | "active" | "failed";

/** An organization's account at its broker. Its provider is the action's (INTEGRATION_ACTION_PROVIDERS). */
export type TConnectionRef = {
	organizationId: string;
	/** The broker's id for the account. */
	accountRef: string;
};

// The actions' outputs are osiris's own types, generated from its OpenAPI spec
// (frubble-ai/osiris, `api-reference/openapi.json`): osiris answers in them, and every other
// broker reads its provider into them. Only the types come from osiris, through its folder's index.

/** Where our GitHub App is installed, as the connected user can see it: an account or organization. */
export type TGithubInstallation = GithubInstallation;

/** A repository our GitHub App can read, through one of its installations. */
export type TGithubRepository = GithubRepository;

/** A Linear team the connected user can see. */
export type TLinearTeam = LinearTeam;

/** A Slack channel the connected user can see. */
export type TSlackChannel = SlackChannel;

/** Every action a broker runs with a connection: our ids, our input and output. */
export type TIntegrationActions = {
	/** Where our GitHub App is installed, of what the connected user can see. */
	"github.listInstallations": {
		input: Record<string, never>;
		output: TGithubInstallation[];
	};
	/** Every repository our GitHub App's installations give the connected user. */
	"github.listRepositories": {
		input: Record<string, never>;
		output: TGithubRepository[];
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

/** The provider each action runs against, so a caller never names it twice. */
export const INTEGRATION_ACTION_PROVIDERS: {
	[TAction in TIntegrationAction]: TIntegrationProvider;
} = {
	"github.listInstallations": "github",
	"github.listRepositories": "github",
	"linear.listTeams": "linear",
	"slack.listChannels": "slack",
};

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
	/**
	 * Run one action with the connection, on the action's provider; its output is checked, nothing
	 * unchecked comes back.
	 */
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
