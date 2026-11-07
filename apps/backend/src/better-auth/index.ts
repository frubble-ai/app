import type { TDb } from "@frubble/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer, organization } from "better-auth/plugins";
import type { TConfig } from "@/config";
import type { TLogger } from "@/logger";
import { createAuthLogger } from "./lib/auth-logger";

/**
 * The configured Better Auth instance (`ctx.auth`). Its HTTP handler is never mounted: the
 * GraphQL resolvers call use cases, which call `auth.api.*`.
 *
 * There is no session cache in front of `getSession`. A cache per API process cannot hear that
 * another process revoked a session (sign-out, password change or reset), so a revoked token kept
 * authenticating there until its entry expired. Every request reads the session from the shared
 * database instead.
 */
export function createAuth(db: TDb, config: TConfig, logger: TLogger) {
	return betterAuth({
		database: drizzleAdapter(db, { provider: "pg" }),
		baseURL: config.betterAuth.url,
		secret: config.betterAuth.secret,
		trustedOrigins: config.cors.origin,
		// Not the default logger: it prints a failed session lookup's query parameters, the token.
		logger: createAuthLogger(logger),
		// Password reset is the code-based `resetPassword` mutation, not Better Auth's.
		emailAndPassword: { enabled: true },
		advanced: {
			// Better Auth skips origin checks under test; keep tests like production.
			disableOriginCheck: false,
		},
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
}

export type TAuth = ReturnType<typeof createAuth>;
