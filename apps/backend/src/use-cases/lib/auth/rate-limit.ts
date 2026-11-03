import type { TDb } from "@frubble/db";
import { rateLimit } from "@frubble/db/schema";
import { sql } from "drizzle-orm";
import { DateTime } from "luxon";
import type { TRateLimitRule } from "@/config";
import { tooManyRequests } from "@/use-cases/lib/shared/domain-errors";

/** The rate-limited flows; each gets its own counters. */
export type TRateLimitedFlow =
	| "sign-in"
	| "sign-up"
	| "sign-up-code"
	| "password-reset-code"
	| "password-reset"
	| "sign-in-again";

/**
 * Count one attempt against each key and throw `tooManyRequests` once any is over its limit.
 * Counters live in Postgres, so the limit holds across instances.
 */
export async function enforceRateLimits(
	db: TDb,
	checks: Array<{ key: string; rule: TRateLimitRule }>,
): Promise<void> {
	let wait: number | null = null;
	for (const { key, rule } of checks) {
		const now = DateTime.utc();
		const windowStart = now.minus({ milliseconds: rule.windowMs });
		const expired = sql`${rateLimit.windowStartedAt} <= ${windowStart.toISO()}::timestamptz`;
		const [row] = await db
			.insert(rateLimit)
			.values({ key, count: 1, windowStartedAt: now.toJSDate() })
			.onConflictDoUpdate({
				target: rateLimit.key,
				set: {
					count: sql`CASE WHEN ${expired} THEN 1 ELSE ${rateLimit.count} + 1 END`,
					windowStartedAt: sql`CASE WHEN ${expired} THEN ${now.toISO()}::timestamptz ELSE ${rateLimit.windowStartedAt} END`,
				},
			})
			.returning({
				count: rateLimit.count,
				windowStartedAt: rateLimit.windowStartedAt,
			});
		if (row && row.count > rule.limit) {
			const windowEnds = DateTime.fromJSDate(row.windowStartedAt).plus({
				milliseconds: rule.windowMs,
			});
			const seconds = Math.max(
				1,
				Math.ceil(windowEnds.diff(now).as("seconds")),
			);
			wait = Math.max(wait ?? 0, seconds);
		}
	}
	if (wait !== null) {
		throw tooManyRequests(
			"Too many attempts. Please wait a few minutes and try again.",
			wait,
		);
	}
}

/** A signed-in user's attempt to prove their password again (changing it), under the per-email rule. */
export async function enforceSignInAgainLimit(
	db: TDb,
	perEmail: TRateLimitRule,
	userId: string,
): Promise<void> {
	await enforceRateLimits(db, [
		{
			key: `sign-in-again:user:${userId}`,
			rule: perEmail,
		},
	]);
}

/** The per-email and per-IP checks for one flow. Without a client IP only the email is limited. */
export function authRateLimitChecks(
	rules: { perEmail: TRateLimitRule; perIp: TRateLimitRule },
	flow: TRateLimitedFlow,
	who: { email?: string; clientIp?: string },
): Array<{ key: string; rule: TRateLimitRule }> {
	const checks: Array<{ key: string; rule: TRateLimitRule }> = [];
	if (who.email) {
		checks.push({ key: `${flow}:email:${who.email}`, rule: rules.perEmail });
	}
	if (who.clientIp) {
		checks.push({ key: `${flow}:ip:${who.clientIp}`, rule: rules.perIp });
	}
	return checks;
}

/**
 * The caller's address from `X-Forwarded-For`. Every trusted proxy on the way appends one entry
 * (Google's external load balancer appends the client's address and then its own), so the
 * client is the entry `trustedProxies` from the end; whatever a client put in the header itself
 * sits before that and is ignored. Undefined without the header, as locally.
 */
export function clientIpFromHeaders(
	headers: Headers,
	trustedProxies: number,
): string | undefined {
	const forwarded = headers.get("x-forwarded-for");
	if (!forwarded) return undefined;
	const entries = forwarded
		.split(",")
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
	const client = entries.at(-1 - trustedProxies);
	return client || undefined;
}
