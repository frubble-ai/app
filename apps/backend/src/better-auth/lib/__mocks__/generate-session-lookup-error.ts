import { faker } from "@faker-js/faker";
import { DrizzleQueryError } from "drizzle-orm/errors";

/**
 * What Drizzle throws when a session lookup fails: the message is the SQL and its parameters, and
 * the driver's error is the cause. `token` is the secret a log line must never carry.
 */
export function generateSessionLookupError(
	overrides: { token?: string; code?: string } = {},
) {
	const token = overrides.token ?? faker.string.alphanumeric(40);
	const cause = Object.assign(new Error(`connect ECONNREFUSED ${token}`), {
		code: overrides.code ?? "ECONNREFUSED",
	});
	const error = new DrizzleQueryError(
		'select "token" from "session" where "session"."token" = $1',
		[token],
		cause,
	);
	return { token, error };
}
