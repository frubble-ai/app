import { GraphQLError } from "graphql";
import { ZodError, type ZodType } from "zod";

export const ErrorCode = {
	UNAUTHENTICATED: "UNAUTHENTICATED",
	FORBIDDEN: "FORBIDDEN",
	BAD_USER_INPUT: "BAD_USER_INPUT",
	NOT_FOUND: "NOT_FOUND",
	TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",
	INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export function throwGraphQLError(code: ErrorCode, message: string): never {
	throw new GraphQLError(message, { extensions: { code } });
}

/** Client mistakes are logged at info, so real failures stand out. */
const EXPECTED_CLIENT_ERROR_CODES = new Set<ErrorCode>([
	ErrorCode.UNAUTHENTICATED,
	ErrorCode.FORBIDDEN,
	ErrorCode.BAD_USER_INPUT,
	ErrorCode.NOT_FOUND,
	ErrorCode.TOO_MANY_REQUESTS,
]);

export function isExpectedClientError(code: unknown): boolean {
	return EXPECTED_CLIENT_ERROR_CODES.has(code as ErrorCode);
}

/** Zod issues as `field: message; field2: message`, the one format clients see for bad input. */
export function formatZodIssues(error: ZodError): string {
	return error.issues
		.map((issue) => {
			const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
			return `${path}${issue.message}`;
		})
		.join("; ");
}

/** Parse input with a Zod schema; a failure is a BAD_USER_INPUT GraphQLError. */
export function parseSchema<TParsed>(
	schema: ZodType<TParsed>,
	data: unknown,
): TParsed {
	try {
		return schema.parse(data);
	} catch (error) {
		if (error instanceof ZodError) {
			throw new GraphQLError(formatZodIssues(error), {
				extensions: { code: ErrorCode.BAD_USER_INPUT },
			});
		}
		throw error;
	}
}
