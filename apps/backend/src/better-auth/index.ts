import type { TDb } from "@frubble/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, organization } from "better-auth/plugins";
import type { TConfig } from "@/config";
import { createDatabaseHooks } from "./lib/database-hooks";
import { createSessionCache, type TSessionCache } from "./lib/session-cache";

/**
 * The configured Better Auth instance (`ctx.auth`) plus its bearer session cache. Its HTTP
 * handler is never mounted: the GraphQL resolvers call use cases, which call `auth.api.*`.
 */
export function createAuth(db: TDb, config: TConfig) {
	// The hooks need the cache and the cache needs `auth`; filled in after construction.
	const cacheRef: { current?: TSessionCache<unknown> } = {};
	const databaseHooks = createDatabaseHooks({
		onSessionDeleted: (token) => cacheRef.current?.invalidateByToken(token),
	});

	const auth = betterAuth({
		database: drizzleAdapter(db, { provider: "pg" }),
		baseURL: config.betterAuth.url,
		secret: config.betterAuth.secret,
		trustedOrigins: config.cors.origin,
		// Password reset is the code-based `resetPassword` mutation, not Better Auth's.
		emailAndPassword: { enabled: true },
		advanced: {
			// Better Auth skips origin checks under test; keep tests like production.
			disableOriginCheck: false,
		},
		databaseHooks,
		plugins: [
			bearer(),
			organization({
				creatorRole: "owner",
				invitationExpiresIn: 7 * 24 * 60 * 60,
				cancelPendingInvitationsOnReInvite: true,
				// Only the address the invitation went to may accept it, once it is verified.
				requireEmailVerificationOnInvitation: true,
				// No `sendInvitationEmail`: the invite use case queues the email itself.
			}),
		],
		user: {
			additionalFields: {
				role: {
					type: "string",
					defaultValue: "application_user",
					input: false,
				},
			},
		},
	});

	cacheRef.current = createSessionCache((args) => auth.api.getSession(args));

	return { auth, sessionCache: cacheRef.current };
}

export type TCreateAuthResult = ReturnType<typeof createAuth>;
export type TAuth = TCreateAuthResult["auth"];
export type TAuthSessionCache = TCreateAuthResult["sessionCache"];
