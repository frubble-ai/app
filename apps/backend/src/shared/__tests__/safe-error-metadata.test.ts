import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { safeErrorMetadata } from "@/shared/safe-error-metadata";

function errorWithCode(code: unknown, cause?: unknown): Error {
	return Object.assign(new Error(faker.lorem.sentence(), { cause }), { code });
}

describe("safeErrorMetadata", () => {
	it.each([
		["a string", faker.lorem.sentence()],
		["a number", faker.number.int()],
		["null", null],
		["undefined", undefined],
		[
			"a plain object that looks like an error",
			{ name: "Error", message: faker.lorem.sentence(), code: "57P01" },
		],
	])("gives no metadata for %s, which is not an Error", (_name, thrown) => {
		expect(safeErrorMetadata(thrown)).toEqual({});
	});

	it("gives the name and the code of an Error, and nothing else of it", () => {
		const error = errorWithCode("57P01");

		expect(safeErrorMetadata(error)).toEqual({
			errorName: "Error",
			errorCode: "57P01",
		});
	});

	it("takes the code from the cause when the error has none, as Drizzle's wrapper does", () => {
		const error = new Error(faker.lorem.sentence(), {
			cause: errorWithCode("ECONNREFUSED"),
		});

		expect(safeErrorMetadata(error)).toEqual({
			errorName: "Error",
			errorCode: "ECONNREFUSED",
		});
	});

	it("never carries the message, the stack or the cause", () => {
		const secret = faker.string.alphanumeric(24);
		const error = errorWithCode("23505", new Error(`params: ${secret}`));
		error.message = `Failed query with params: ${secret}`;

		const metadata = JSON.stringify(safeErrorMetadata(error));

		expect(metadata).not.toContain(secret);
		expect(Object.keys(safeErrorMetadata(error)).sort()).toEqual([
			"errorCode",
			"errorName",
		]);
	});

	it.each([
		["too long", faker.string.alphanumeric(33)],
		["with spaces", `${faker.string.alpha(4)} ${faker.string.alpha(4)}`],
		["not a string", faker.number.int()],
	])("drops a code that is %s", (_name, code) => {
		expect(safeErrorMetadata(errorWithCode(code))).toEqual({
			errorName: "Error",
			errorCode: undefined,
		});
	});
});
