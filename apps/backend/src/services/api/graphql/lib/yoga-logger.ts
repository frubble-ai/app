import {
	type Attributes,
	Logger as HiveLogger,
	type LogLevel,
	type LogWriter,
} from "@graphql-hive/logger";
import { logger } from "@/logger";
import { isExpectedClientError } from "@/services/api/graphql/lib/errors";

type TPinoLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

const PINO_LEVEL: Record<LogLevel, TPinoLevel> = {
	trace: "trace",
	debug: "debug",
	info: "info",
	warn: "warn",
	error: "error",
};

type TLoggedError = {
	message: string;
	extensions?: { code?: unknown };
};

function isLoggedError(value: unknown): value is TLoggedError {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as { message?: unknown }).message === "string"
	);
}

/**
 * The error in a line, as the Hive logger hands it over: already serialized to a plain object,
 * either as one attribute or as the attributes themselves when an error was logged directly.
 */
function errorIn(
	attrs: Attributes | null | undefined,
): TLoggedError | undefined {
	if (!attrs) return undefined;
	if (isLoggedError(attrs)) return attrs;
	return Object.values(attrs).find(isLoggedError);
}

/**
 * Yoga's log lines through pino. Every masked error lands here at `error`; a client mistake (a
 * domain error code) is logged at `info` instead, so real failures stand out.
 */
const pinoWriter: LogWriter = {
	write(level, attrs, msg) {
		const error = errorIn(attrs);
		const code = error?.extensions?.code;
		const pinoLevel =
			level === "error" && isExpectedClientError(code)
				? "info"
				: PINO_LEVEL[level];
		logger[pinoLevel]({ ...attrs, err: error, code }, msg ?? "");
	},
};

export function createYogaLogger(): HiveLogger {
	return new HiveLogger({ level: "debug", writers: [pinoWriter] });
}
