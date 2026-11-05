import type { BetterAuthOptions } from "better-auth";
import type { TLogger } from "@/logger";

type TAuthLogOptions = NonNullable<BetterAuthOptions["logger"]>;
type TAuthLogLevel = Parameters<NonNullable<TAuthLogOptions["log"]>>[0];

const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;

/** What the logger needs of the app logger, so a test can hand in a spy. */
type TAuthLoggerTarget = Pick<TLogger, (typeof LOG_LEVELS)[number]>;

// A driver error code: Postgres SQLSTATE ("57P01") or a Node system code ("ECONNREFUSED").
const SAFE_CODE = /^[A-Za-z0-9_]{1,32}$/;

/** The only parts of a failure a line may carry; everything else on the error is dropped. */
type TErrorMetadata = { errorName?: string; errorCode?: string };

/** The error's `code` when it is a short identifier like a SQLSTATE or a system code, else undefined. */
function codeOf(error: unknown): string | undefined {
	const code = (error as { code?: unknown } | null)?.code;
	return typeof code === "string" && SAFE_CODE.test(code) ? code : undefined;
}

/**
 * The name and code of the error and of its cause, never a message. Drizzle wraps the driver's
 * error in one whose message is the SQL and its parameters, and a session lookup's parameter is
 * the session token. Redacting by field name cannot catch a token inside that text.
 */
function metadataOf(error: Error): TErrorMetadata {
	const cause = error.cause instanceof Error ? error.cause : undefined;
	return {
		errorName: error.name,
		errorCode: codeOf(error) ?? codeOf(cause),
	};
}

/**
 * Better Auth's log lines through the app logger. Its default logger prints the whole error to
 * stderr: message, stack and cause. When a session lookup fails that includes the token in the
 * query's parameters, and anyone who reads the logs can replay it. A line here carries Better
 * Auth's own message and, for a failure, the error's name and code. Nothing else it is handed is
 * written.
 */
export function createAuthLogger(target: TAuthLoggerTarget): TAuthLogOptions {
	return {
		/** One Better Auth line, written at the same level through the app logger. */
		log(level: TAuthLogLevel, message: unknown, ...args: unknown[]) {
			// Some call sites pass the error itself as the message.
			const failure = [message, ...args].find(
				(value): value is Error => value instanceof Error,
			);
			target[level](
				{ component: "better-auth", ...(failure && metadataOf(failure)) },
				typeof message === "string" ? message : "",
			);
		},
	};
}
