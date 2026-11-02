import { CombinedGraphQLErrors } from "@apollo/client";
import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { codeFlowError } from "@/shared/code-flow";

function refusal(code: string, message = faker.lorem.sentence()) {
	return new CombinedGraphQLErrors({
		errors: [{ message, extensions: { code } }],
	});
}

describe("codeFlowError", () => {
	it("shows the API's own reason for bad input", () => {
		const message = faker.lorem.sentence();

		expect(codeFlowError(refusal("BAD_USER_INPUT", message))).toEqual({
			message,
		});
	});

	it("explains a rate limit", () => {
		expect(codeFlowError(refusal("TOO_MANY_REQUESTS"))).toEqual({
			key: "errors.tooMany",
		});
	});

	it("falls back to a generic error for anything else", () => {
		expect(codeFlowError(new Error("offline"))).toEqual({
			key: "errors.generic",
		});
		expect(codeFlowError(refusal("INTERNAL_SERVER_ERROR"))).toEqual({
			key: "errors.generic",
		});
	});
});
