import { DateTime } from "luxon";
import { z } from "zod";

// Zod schemas for the scalars, shared by the scalar resolvers, the generated validation and the
// use cases' argument schemas.

const USER_ID_REGEX = /^[A-Za-z0-9_-]{16,64}$/;

/** The `DateTime` scalar: an ISO 8601 string, parsed into a Luxon `DateTime` at UTC. */
export const dateTimeSchema = z.string().transform((value, context) => {
	const parsed = DateTime.fromISO(value, { zone: "utc" });
	if (!parsed.isValid) {
		context.addIssue({
			code: "custom",
			message: `Invalid DateTime: "${value}"`,
		});
		return z.NEVER;
	}
	return parsed;
});

/** The `ID` scalar: UUIDs. */
export const idSchema = z.uuid();

/** The `UserId` scalar: a Better Auth user id. */
export const userIdSchema = z
	.string()
	.regex(
		USER_ID_REGEX,
		"UserId must be a 16 to 64 character Better Auth user id",
	);
