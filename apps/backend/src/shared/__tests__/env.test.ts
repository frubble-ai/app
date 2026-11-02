import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { envVar, listenEnvFields, parseEnv } from "@/shared/env";

const schema = z.object({
	NAME: envVar(z.string().min(1)),
	MODE: envVar(z.enum(["a", "b"]).default("a")),
	...listenEnvFields,
});

describe("parseEnv", () => {
	it("returns the parsed values with the defaults filled in", () => {
		const name = faker.word.noun();

		expect(parseEnv(schema, { NAME: name })).toEqual({
			NAME: name,
			MODE: "a",
			HOST: "0.0.0.0",
			PORT: 8080,
		});
	});

	it("names every missing variable in one error", () => {
		expect(() => parseEnv(schema, {}, "test environment")).toThrow(
			/Invalid test environment\.\nMissing required environment variables: NAME/,
		);
	});

	it("treats a blank value as unset", () => {
		expect(() => parseEnv(schema, { NAME: "  " })).toThrow(/Missing.*NAME/);
	});

	it.each([
		{
			label: "a value outside the enum",
			env: { NAME: "x", MODE: "c" },
			message: /MODE: /,
		},
		{
			label: "a port that is not a number",
			env: { NAME: "x", PORT: "http" },
			message: /PORT: /,
		},
		{
			label: "a port out of range",
			env: { NAME: "x", PORT: "70000" },
			message: /PORT: /,
		},
	])("names the variable with a bad value: $label", ({ env, message }) => {
		expect(() => parseEnv(schema, env)).toThrow(message);
	});

	it("reports a schema-level problem without a variable name", () => {
		const refined = schema.superRefine((_env, context) => {
			context.addIssue({ code: "custom", message: "the pair does not match" });
		});

		expect(() => parseEnv(refined, { NAME: "x" })).toThrow(
			/the pair does not match/,
		);
	});
});
