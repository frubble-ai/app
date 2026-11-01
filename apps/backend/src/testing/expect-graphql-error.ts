import { GraphQLError } from "graphql";
import { expect } from "vitest";
import { domainErrorMask } from "@/services/api/graphql";
import type { ErrorCode } from "@/services/api/graphql/lib/errors";

/** Assert a resolver call fails with this code, through the same mask Yoga uses. Pass a thunk: guards throw synchronously. */
export async function expectGraphqlError(
	call: () => unknown,
	expectedCode: ErrorCode | `${ErrorCode}`,
): Promise<GraphQLError> {
	let error: unknown;
	try {
		await call();
	} catch (caught) {
		error = caught;
	}
	expect(error).toBeDefined();
	const gqlError = domainErrorMask(error, "Unexpected error.");
	expect(gqlError).toBeInstanceOf(GraphQLError);
	expect(gqlError.extensions.code).toBe(expectedCode);
	return gqlError;
}
