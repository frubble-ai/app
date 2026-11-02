import { internalError } from "@/use-cases/lib/shared/domain-errors";

/** The signed-in user every sign-in and sign-up use case returns. */
export type TAuthenticatedUser = {
	id: string;
	name: string;
	email: string;
};

export type TAuthSignInResult = {
	sessionToken: string;
	user: TAuthenticatedUser;
};

/** Turn a Better Auth sign-in or sign-up result into the auth payload, or throw `failureMessage`. */
export function formatAuthSignInResult(
	result: unknown,
	failureMessage: string,
): TAuthSignInResult {
	const token = (result as { token?: unknown } | null)?.token;
	const user = (result as { user?: unknown } | null)?.user;
	if (
		typeof token !== "string" ||
		!token ||
		!user ||
		typeof user !== "object"
	) {
		throw internalError(failureMessage);
	}
	const fields = user as {
		id?: unknown;
		name?: unknown;
		email?: unknown;
	};
	if (
		typeof fields.id !== "string" ||
		typeof fields.name !== "string" ||
		typeof fields.email !== "string"
	) {
		throw internalError(failureMessage);
	}
	return {
		sessionToken: token,
		user: {
			id: fields.id,
			name: fields.name,
			email: fields.email,
		},
	};
}
