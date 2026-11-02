import type { BetterAuthOptions } from "better-auth";

export type TDatabaseHookCallbacks = {
	/** Wired to the bearer session cache so sign-out takes effect at once. */
	onSessionDeleted: (token: string) => void;
};

/** Better Auth `databaseHooks`: thin glue, no logic of its own. */
export function createDatabaseHooks({
	onSessionDeleted,
}: TDatabaseHookCallbacks): BetterAuthOptions["databaseHooks"] {
	return {
		session: {
			delete: {
				after: async (session) => {
					const token = (session as { token?: unknown }).token;
					if (typeof token === "string" && token.length > 0) {
						onSessionDeleted(token);
					}
				},
			},
		},
	};
}
