// A driver error code: Postgres SQLSTATE ("57P01") or a Node system code ("ECONNREFUSED").
const SAFE_CODE = /^[A-Za-z0-9_]{1,32}$/;

/** The only parts of a failure a log line may carry; everything else on the error is dropped. */
export type TErrorMetadata = { errorName?: string; errorCode?: string };

/** The error's `code` when it is a short identifier like a SQLSTATE or a system code, else undefined. */
function codeOf(error: unknown): string | undefined {
	const code = (error as { code?: unknown } | null)?.code;
	return typeof code === "string" && SAFE_CODE.test(code) ? code : undefined;
}

/**
 * The name and code of the error and of its cause, never a message, stack or parameter. Drizzle
 * wraps the driver's error in one whose message is the SQL and its parameters, which can be a
 * session token or the hash of a one-time code. Redacting by field name cannot catch a secret
 * inside that text, so a line that reports a failure carries this and nothing else of the error.
 * Anything that is not an `Error` yields no metadata.
 */
export function safeErrorMetadata(error: unknown): TErrorMetadata {
	if (!(error instanceof Error)) return {};
	const cause = error.cause instanceof Error ? error.cause : undefined;
	return {
		errorName: error.name,
		errorCode: codeOf(error) ?? codeOf(cause),
	};
}
