import { GraphQLError, GraphQLScalarType, Kind } from "graphql";
import { DateTime } from "luxon";
import { dateTimeSchema, userIdSchema } from "./scalar-schemas";

type TParseable<TParsed> = {
	safeParse(
		value: unknown,
	):
		| { success: true; data: TParsed }
		| { success: false; error: { issues: Array<{ message: string }> } };
};

function parseOrThrow<TParsed>(
	schema: TParseable<TParsed>,
	value: unknown,
): TParsed {
	const result = schema.safeParse(value);
	if (!result.success) {
		throw new GraphQLError(
			result.error.issues.map((issue) => issue.message).join("; "),
		);
	}
	return result.data;
}

/** `UserId`: a Better Auth user id, checked by `userIdSchema` both ways. */
export const userIdScalar = new GraphQLScalarType({
	name: "UserId",
	description: "A Better Auth user id.",
	serialize(value: unknown): string {
		if (typeof value !== "string") {
			throw new GraphQLError("UserId cannot represent a non-string value");
		}
		return parseOrThrow(userIdSchema, value);
	},
	parseValue(value: unknown): string {
		if (typeof value !== "string") {
			throw new GraphQLError("UserId must be a string");
		}
		return parseOrThrow(userIdSchema, value);
	},
	parseLiteral(ast): string {
		if (ast.kind !== Kind.STRING) {
			throw new GraphQLError("UserId must be a string");
		}
		return parseOrThrow(userIdSchema, ast.value);
	},
});

function toDateTime(value: unknown): DateTime | null {
	if (DateTime.isDateTime(value)) return value;
	if (value instanceof Date) return DateTime.fromJSDate(value, { zone: "utc" });
	if (typeof value === "string")
		return DateTime.fromISO(value, { zone: "utc" });
	return null;
}

/**
 * `DateTime`: an ISO 8601 string at UTC on the wire. Resolvers may return a Luxon `DateTime`, a
 * `Date` (Drizzle's timestamp columns) or an ISO string; inputs parse to a Luxon `DateTime`.
 */
export const dateTimeScalar = new GraphQLScalarType({
	name: "DateTime",
	description: "A date-time string at UTC, ISO 8601.",
	serialize(value: unknown): string {
		const parsed = toDateTime(value);
		if (!parsed?.isValid) {
			throw new GraphQLError(`DateTime cannot represent ${String(value)}`);
		}
		return parsed.toUTC().toISO() ?? "";
	},
	parseValue(value: unknown): DateTime {
		if (typeof value !== "string") {
			throw new GraphQLError("DateTime must be a string");
		}
		return parseOrThrow(dateTimeSchema, value);
	},
	parseLiteral(ast): DateTime {
		if (ast.kind !== Kind.STRING) {
			throw new GraphQLError("DateTime must be a string");
		}
		return parseOrThrow(dateTimeSchema, ast.value);
	},
});
