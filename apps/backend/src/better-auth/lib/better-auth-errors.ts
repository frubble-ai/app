import { isAPIError } from "better-auth/api";

/** Better Auth's stable error id is `APIError.body.code`; the messages get reworded. */
export function getBetterAuthErrorCode(err: unknown): string | null {
	if (!isAPIError(err)) return null;
	const code = (err as { body?: { code?: unknown } }).body?.code;
	return typeof code === "string" ? code : null;
}

/** The codes the use cases branch on, mirrored from Better Auth's `BASE_ERROR_CODES`. */
export const BetterAuthErrorCode = {
	PASSWORD_TOO_SHORT: "PASSWORD_TOO_SHORT",
	PASSWORD_TOO_LONG: "PASSWORD_TOO_LONG",
	USER_ALREADY_EXISTS: "USER_ALREADY_EXISTS",
	USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
		"USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
	INVALID_EMAIL: "INVALID_EMAIL",
	INVALID_PASSWORD: "INVALID_PASSWORD",
	INVALID_EMAIL_OR_PASSWORD: "INVALID_EMAIL_OR_PASSWORD",
	EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
	CREDENTIAL_ACCOUNT_NOT_FOUND: "CREDENTIAL_ACCOUNT_NOT_FOUND",
} as const;

export type TBetterAuthErrorCode =
	(typeof BetterAuthErrorCode)[keyof typeof BetterAuthErrorCode];
