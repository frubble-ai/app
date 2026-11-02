import { isAPIError } from "better-auth/api";
import {
	getBetterAuthErrorCode,
	type TBetterAuthErrorCode,
} from "@/better-auth/lib/better-auth-errors";
import {
	badInput,
	forbidden,
	notFound,
	tooManyRequests,
	unauthenticated,
} from "@/use-cases/lib/shared/domain-errors";

/** Rethrow a Better Auth error as the domain error mapped to its code; anything else as is. */
export function rethrowAsDomainError(
	err: unknown,
	map: Partial<Record<TBetterAuthErrorCode, Error>>,
): never {
	const code = getBetterAuthErrorCode(err) as TBetterAuthErrorCode | null;
	throw (code && map[code]) || err;
}

const DOMAIN_ERROR_BY_STATUS: Record<number, (message: string) => Error> = {
	400: badInput,
	401: unauthenticated,
	403: forbidden,
	404: notFound,
	422: badInput,
	429: tooManyRequests,
};

/**
 * A Better Auth 4xx `APIError` becomes the matching domain error, so it reaches the client typed
 * rather than as a redacted 500; 5xx and everything else pass through unchanged.
 */
export function betterAuthClientErrorToDomainError(err: unknown): unknown {
	if (!isAPIError(err)) return err;
	const toDomainError = DOMAIN_ERROR_BY_STATUS[err.statusCode];
	if (!toDomainError) return err;
	return toDomainError(err.body?.message || err.message || "Request rejected.");
}
