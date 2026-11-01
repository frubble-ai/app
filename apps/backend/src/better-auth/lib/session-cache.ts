import { createHash } from "node:crypto";
import { LRUCache } from "lru-cache";

/**
 * In-process cache of `getSession` for bearer tokens: bounded LRU, 30 s TTL, evicted on sign-out.
 * Keys are the SHA-256 of the token; only hits are cached, so garbage tokens cannot flush it.
 */

const SESSION_CACHE_TTL_MS = 30_000;
const SESSION_CACHE_MAX_ENTRIES = 5_000;

type TGetSession<TSession> = (args: { headers: Headers }) => Promise<TSession>;

function hashToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

function extractBearerToken(headers: Headers): string | null {
	const auth = headers.get("authorization");
	if (!auth) return null;
	const space = auth.indexOf(" ");
	if (space < 0) return null;
	if (auth.slice(0, space).toLowerCase() !== "bearer") return null;
	const token = auth.slice(space + 1).trim();
	return token.length > 0 ? token : null;
}

export interface TSessionCache<TSession> {
	/** The session for the request; bearer lookups are cached and concurrent misses coalesce. */
	get(headers: Headers): Promise<TSession>;
	/** Evict on sign-out. Other instances keep their entry until the TTL expires. */
	invalidateByToken(token: string): void;
}

export function createSessionCache<TSession>(
	getSession: TGetSession<TSession>,
): TSessionCache<TSession> {
	const cache = new LRUCache<string, NonNullable<TSession> & object>({
		max: SESSION_CACHE_MAX_ENTRIES,
		ttl: SESSION_CACHE_TTL_MS,
	});
	const inflight = new Map<string, Promise<TSession>>();
	// Tokens invalidated while a lookup was in flight, so that lookup cannot re-cache a dead session.
	const invalidatedKeys = new Set<string>();

	async function get(headers: Headers): Promise<TSession> {
		const token = extractBearerToken(headers);
		if (!token) return getSession({ headers });

		const key = hashToken(token);
		const cached = cache.get(key);
		if (cached !== undefined) return cached;

		const existing = inflight.get(key);
		if (existing) return existing;

		const promise = getSession({ headers })
			.then((result) => {
				if (
					result != null &&
					typeof result === "object" &&
					!invalidatedKeys.has(key)
				) {
					cache.set(key, result as NonNullable<TSession> & object);
				}
				return result;
			})
			.finally(() => {
				inflight.delete(key);
				invalidatedKeys.delete(key);
			});
		inflight.set(key, promise);
		return promise;
	}

	function invalidateByToken(token: string): void {
		const key = hashToken(token);
		cache.delete(key);
		if (inflight.has(key)) {
			invalidatedKeys.add(key);
		}
	}

	return { get, invalidateByToken };
}
