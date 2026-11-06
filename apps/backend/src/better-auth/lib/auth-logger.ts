import type { BetterAuthOptions } from "better-auth";
import type { TLogger } from "@/logger";
import { safeErrorMetadata } from "@/shared/safe-error-metadata";

type TAuthLogOptions = NonNullable<BetterAuthOptions["logger"]>;
type TAuthLogLevel = Parameters<NonNullable<TAuthLogOptions["log"]>>[0];

const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;

/** What the logger needs of the app logger, so a test can hand in a spy. */
type TAuthLoggerTarget = Pick<TLogger, (typeof LOG_LEVELS)[number]>;

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
				{
					component: "better-auth",
					...(failure && safeErrorMetadata(failure)),
				},
				typeof message === "string" ? message : "",
			);
		},
	};
}
