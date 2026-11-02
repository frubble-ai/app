import { ZodError } from "zod";

/**
 * Errors use cases throw, identified by `name`. The GraphQL mask maps them: badInput →
 * BAD_USER_INPUT, notFound → NOT_FOUND, unauthenticated → UNAUTHENTICATED, forbidden → FORBIDDEN,
 * tooManyRequests → TOO_MANY_REQUESTS, internalError → INTERNAL_SERVER_ERROR. A domain error's
 * `details` reach the client in `extensions`. Anything else becomes a redacted 500.
 */
export const DOMAIN_ERROR_NAMES = {
	BAD_INPUT: "BadInputError",
	NOT_FOUND: "NotFoundError",
	UNAUTHENTICATED: "UnauthenticatedError",
	FORBIDDEN: "ForbiddenError",
	INTERNAL: "InternalServerError",
	TOO_MANY_REQUESTS: "TooManyRequestsError",
} as const;

const DOMAIN_ERROR_NAME_SET = new Set<string>(
	Object.values(DOMAIN_ERROR_NAMES),
);

/** An expected client error: a domain error (other than `internalError`) or a failed input parse. */
export function isDomainError(err: unknown): boolean {
	if (err instanceof ZodError) return true;
	return (
		err instanceof Error &&
		err.name !== DOMAIN_ERROR_NAMES.INTERNAL &&
		DOMAIN_ERROR_NAME_SET.has(err.name)
	);
}

export function badInput(message: string): Error {
	return Object.assign(new Error(message), {
		name: DOMAIN_ERROR_NAMES.BAD_INPUT,
	});
}

export function notFound(message: string): Error {
	return Object.assign(new Error(message), {
		name: DOMAIN_ERROR_NAMES.NOT_FOUND,
	});
}

export function unauthenticated(message: string): Error {
	return Object.assign(new Error(message), {
		name: DOMAIN_ERROR_NAMES.UNAUTHENTICATED,
	});
}

export function forbidden(message: string): Error {
	return Object.assign(new Error(message), {
		name: DOMAIN_ERROR_NAMES.FORBIDDEN,
	});
}

/** Over a rate limit; `retryAfterSeconds` says when the next attempt can count. */
export function tooManyRequests(
	message: string,
	retryAfterSeconds?: number,
): Error {
	return Object.assign(new Error(message), {
		name: DOMAIN_ERROR_NAMES.TOO_MANY_REQUESTS,
		...(retryAfterSeconds === undefined
			? {}
			: { details: { retryAfterSeconds } }),
	});
}

/** How long a rate-limited caller should wait, from a `tooManyRequests` error. */
export function retryAfterSeconds(error: unknown): number | null {
	const details = (error as { details?: { retryAfterSeconds?: unknown } })
		?.details;
	return typeof details?.retryAfterSeconds === "number"
		? details.retryAfterSeconds
		: null;
}

export function internalError(message: string): Error {
	return Object.assign(new Error(message), {
		name: DOMAIN_ERROR_NAMES.INTERNAL,
	});
}
