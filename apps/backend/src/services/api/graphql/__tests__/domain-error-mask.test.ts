import { GraphQLError } from "graphql";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { domainErrorMask } from "@/services/api/graphql";
import {
	badInput,
	forbidden,
	internalError,
	notFound,
	tooManyRequests,
	unauthenticated,
} from "@/use-cases/lib/shared/domain-errors";

describe("domainErrorMask", () => {
	it.each([
		{
			label: "bad input",
			error: badInput("Please enter a valid email address."),
			code: "BAD_USER_INPUT",
		},
		{
			label: "not found",
			error: notFound("No such thing."),
			code: "NOT_FOUND",
		},
		{
			label: "unauthenticated",
			error: unauthenticated("Sign in first."),
			code: "UNAUTHENTICATED",
		},
		{ label: "forbidden", error: forbidden("Not yours."), code: "FORBIDDEN" },
		{
			label: "too many requests",
			error: tooManyRequests("Slow down."),
			code: "TOO_MANY_REQUESTS",
		},
	])(
		"answers a $label domain error with its code and message",
		({ error, code }) => {
			const masked = domainErrorMask(error, "Unexpected error.");

			expect(masked.extensions.code).toBe(code);
			expect(masked.message).toBe(error.message);
		},
	);

	it("carries a domain error's details into the extensions", () => {
		const masked = domainErrorMask(tooManyRequests("Slow down.", 42), "x");

		expect(masked.extensions).toMatchObject({
			code: "TOO_MANY_REQUESTS",
			retryAfterSeconds: 42,
		});
	});

	it("turns a failed input parse into bad input naming the field", () => {
		const parse = z.object({ email: z.email() }).safeParse({ email: "nope" });

		const masked = domainErrorMask(parse.error, "x");

		expect(masked.extensions.code).toBe("BAD_USER_INPUT");
		expect(masked.message).toMatch(/^email: /);
	});

	it("hides a plain error behind the given message", () => {
		const masked = domainErrorMask(
			new Error("secret stack details"),
			"Unexpected error.",
		);

		expect(masked.extensions.code).toBe("INTERNAL_SERVER_ERROR");
		expect(masked.message).toBe("Unexpected error.");
	});

	it("keeps the wording of an internal error a use case chose to show", () => {
		const masked = domainErrorMask(
			internalError("Sign up failed: no session token returned"),
			"Unexpected error.",
		);

		expect(masked.extensions.code).toBe("INTERNAL_SERVER_ERROR");
		expect(masked.message).toBe("Sign up failed: no session token returned");
	});

	it("keeps a GraphQL error a resolver threw itself", () => {
		const thrown = new GraphQLError("Role required", {
			extensions: { code: "FORBIDDEN" },
		});

		expect(domainErrorMask(thrown, "x")).toBe(thrown);
	});

	it("unwraps a domain error graphql-js located", () => {
		const located = new GraphQLError("wrapped", {
			originalError: forbidden("Not yours."),
		});

		const masked = domainErrorMask(located, "x");

		expect(masked.extensions.code).toBe("FORBIDDEN");
		expect(masked.message).toBe("Not yours.");
	});
});
