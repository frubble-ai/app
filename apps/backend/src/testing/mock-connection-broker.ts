import { faker } from "@faker-js/faker";
import type { TIntegrationProvider } from "@frubble/db";
import type {
	TAccountState,
	TConnectionBroker,
	TConnectionRef,
	TIntegrationAction,
	TIntegrationActions,
} from "@/integrations";

// A broker held in memory, for the use-case tests: it keeps accounts the way a real one would, and
// the test decides what each answer is. The contract tests (connection-broker-contract.ts) hold it
// to the same behaviour as the real brokers.

type Account = {
	organizationId: string;
	provider: TIntegrationProvider;
	attemptId: string;
	/** What `accountState` answers once nothing is queued. */
	state: TAccountState;
	/** Answers `accountState` gives first, in turn. */
	queued: TAccountState[];
	/** Whether `findAccountsByAttempt` sees it yet. */
	listed: boolean;
};

type NextConnect =
	| {
			kind: "answer";
			redirectUrl: string | undefined;
			before?: () => Promise<void>;
	  }
	| { kind: "lose"; listed: boolean };

type StateRead =
	| { kind: "fail" }
	| { kind: "hang" }
	| { kind: "turns"; reads: { inFlight: number; mostAtOnce: number } };

export type TMockConnectionBroker = ReturnType<
	typeof createMockConnectionBroker
>;

export function createMockConnectionBroker() {
	const accounts = new Map<string, Account>();
	const calls: string[] = [];
	const connects: Array<{
		attemptId: string;
		callbackUrl: string;
		accountRef: string;
	}> = [];
	const lost: string[] = [];
	const removed: string[] = [];
	const runs: Array<{
		action: TIntegrationAction;
		connection: TConnectionRef;
	}> = [];
	const outputs = new Map<TIntegrationAction, unknown>();
	const reads = new Map<string, StateRead>();
	let next: NextConnect | undefined;
	let removing: "works" | "fails" = "works";

	function newAccountRef(): string {
		return `acct_${faker.string.alphanumeric(12)}`;
	}

	const broker: TConnectionBroker = {
		async startConnect(args) {
			calls.push("startConnect");
			const answer = next ?? {
				kind: "answer",
				redirectUrl: faker.internet.url(),
			};
			next = undefined;
			const accountRef = newAccountRef();
			accounts.set(accountRef, {
				organizationId: args.organizationId,
				provider: args.provider,
				attemptId: args.attemptId,
				state: "pending",
				queued: [],
				listed: answer.kind === "answer" || answer.listed,
			});
			if (answer.kind === "lose") {
				lost.push(accountRef);
				throw new Error("the broker's answer was lost");
			}
			await answer.before?.();
			connects.push({
				attemptId: args.attemptId,
				callbackUrl: args.callbackUrl,
				accountRef,
			});
			return { accountRef, redirectUrl: answer.redirectUrl };
		},

		async accountState(accountRef, options = {}) {
			calls.push("accountState");
			const read = reads.get(accountRef);
			if (read?.kind === "fail") {
				reads.delete(accountRef);
				throw new Error("the broker cannot be reached");
			}
			if (read?.kind === "hang") {
				return new Promise<TAccountState>((_, reject) => {
					options.signal?.addEventListener("abort", () =>
						reject(options.signal?.reason),
					);
				});
			}
			const account = accounts.get(accountRef);
			if (!account) throw new Error(`no account ${accountRef}`);
			if (read?.kind === "turns") {
				read.reads.inFlight += 1;
				read.reads.mostAtOnce = Math.max(
					read.reads.mostAtOnce,
					read.reads.inFlight,
				);
				await new Promise((resolve) => setTimeout(resolve, 50));
				read.reads.inFlight -= 1;
			}
			return account.queued.shift() ?? account.state;
		},

		async removeAccount(accountRef) {
			calls.push("removeAccount");
			if (removing === "fails") throw new Error("the broker is down");
			accounts.delete(accountRef);
			removed.push(accountRef);
		},

		async findAccountsByAttempt(args) {
			calls.push("findAccountsByAttempt");
			return [...accounts.entries()]
				.filter(
					([, account]) =>
						account.listed &&
						account.organizationId === args.organizationId &&
						account.provider === args.provider &&
						account.attemptId === args.attemptId,
				)
				.map(([accountRef]) => accountRef);
		},

		async run(action, connection) {
			calls.push("run");
			runs.push({ action, connection });
			if (!outputs.has(action)) throw new Error(`no answer for ${action}`);
			return outputs.get(
				action,
			) as TIntegrationActions[typeof action]["output"];
		},
	};

	function account(accountRef: string): Account {
		const found = accounts.get(accountRef);
		if (!found) throw new Error(`no account ${accountRef}`);
		return found;
	}

	return {
		broker,

		/** The next `startConnect` opens `redirectUrl` (none: no page); `before` runs first, for races. */
		answerConnect(answer: {
			redirectUrl: string | undefined;
			before?: () => Promise<void>;
		}) {
			next = { kind: "answer", ...answer };
		},
		/** The next `startConnect` fails after making its account; `listed`: the broker lists it yet. */
		loseConnect(options: { listed: boolean }) {
			next = { kind: "lose", listed: options.listed };
		},
		/** The accounts made by connects whose answer was lost, now listed. */
		listLostAccounts() {
			for (const accountRef of lost) account(accountRef).listed = true;
		},
		/** The account made by the last connect whose answer was lost. */
		lastLostAccount(): string {
			const accountRef = lost.at(-1);
			if (!accountRef) throw new Error("no connect lost its answer");
			return accountRef;
		},
		/** The last connect that answered: its attempt, callback and account. */
		lastConnect() {
			const connect = connects.at(-1);
			if (!connect) throw new Error("no connect answered");
			return connect;
		},

		/** The account's state from now on; `once`: only the next read, then as before. */
		answerState(
			accountRef: string,
			state: TAccountState,
			options: { once?: boolean } = {},
		) {
			if (options.once) account(accountRef).queued.push(state);
			else account(accountRef).state = state;
		},
		/**
		 * Reads answer `states` in turn, each held briefly; counts how many were in flight at once,
		 * which a test reads to prove settles ask one at a time.
		 */
		answerStatesInTurn(accountRef: string, states: TAccountState[]) {
			account(accountRef).queued.push(...states);
			const counted = { inFlight: 0, mostAtOnce: 0 };
			reads.set(accountRef, { kind: "turns", reads: counted });
			return counted;
		},
		/** The next read of the account fails, as when the broker is unreachable. */
		failState(accountRef: string) {
			reads.set(accountRef, { kind: "fail" });
		},
		/** Reads of the account never answer; they end only when their signal aborts. */
		hangState(accountRef: string) {
			reads.set(accountRef, { kind: "hang" });
		},

		/** Removing fails until `restoreRemove`, as while the broker is down. */
		failRemove() {
			removing = "fails";
		},
		restoreRemove() {
			removing = "works";
		},
		/** The accounts the broker confirmed removed, in order. */
		removedAccounts(): string[] {
			return [...removed];
		},

		/** `action` answers `output` from now on. */
		answerAction<TAction extends TIntegrationAction>(
			action: TAction,
			output: TIntegrationActions[TAction]["output"],
		) {
			outputs.set(action, output);
		},
		/** Every action run, with the connection it ran through. */
		runs() {
			return [...runs];
		},
		/** Every call the broker received, by method. */
		calls(): string[] {
			return [...calls];
		},
	};
}
