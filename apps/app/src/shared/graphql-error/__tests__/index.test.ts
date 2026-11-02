import { CombinedGraphQLErrors } from "@apollo/client";
import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { graphqlErrorCode, graphqlErrorMessage } from "@/shared/graphql-error";

function apiError(message: string, code?: string) {
	return new CombinedGraphQLErrors({
		errors: [{ message, ...(code ? { extensions: { code } } : {}) }],
	});
}

describe("graphql errors", () => {
	it("reads the API's code and message", () => {
		const message = faker.lorem.sentence();
		const error = apiError(message, "BAD_USER_INPUT");

		expect(graphqlErrorCode(error)).toBe("BAD_USER_INPUT");
		expect(graphqlErrorMessage(error)).toBe(message);
	});

	it("has no code when the API sent none", () => {
		expect(graphqlErrorCode(apiError(faker.lorem.sentence()))).toBeNull();
	});

	it("says nothing about a network failure", () => {
		const error = new Error("Failed to fetch");

		expect(graphqlErrorCode(error)).toBeNull();
		expect(graphqlErrorMessage(error)).toBeNull();
	});
});
