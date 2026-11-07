import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { withTypenames } from "../typenames";

describe("withTypenames", () => {
	it("adds each object's type, through fragments, as the API sends it", () => {
		const query = `
			mutation SignIn { signIn(input: { email: "", password: "" }) { token user { ...UserFields } } }
			fragment UserFields on Me { id email }
		`;
		const data = {
			signIn: { token: "t1", user: { id: "u1", email: "a@b.c" } },
		};

		expect(withTypenames(query, data)).toEqual({
			signIn: {
				__typename: "AuthPayload",
				token: "t1",
				user: { __typename: "Me", id: "u1", email: "a@b.c" },
			},
		});
	});

	it("leaves nulls and missing data as they are", () => {
		expect(withTypenames("query Me { me { id } }", { me: null })).toEqual({
			me: null,
		});
		expect(withTypenames("query Me { me { id } }", undefined)).toBeUndefined();
	});

	it("expands each fragment once per object, so repeated spreads stay within the budget", () => {
		// Every fragment spreads the next one twice: expanding each occurrence is 2^depth steps,
		// far past the traversal budget, so a regression fails here with the budget error instead
		// of hanging, and no wall-clock measurement is needed.
		const depth = 28;
		const fragments = Array.from(
			{ length: depth },
			(_, level) =>
				`fragment F${level} on AuthPayload { ...F${level + 1} ...F${level + 1} }`,
		).join("\n");
		// Two objects get the same fragments: the "already expanded" set must belong to one
		// object, or the second would come back without its fields.
		const query = `mutation Q {
			first: signIn(input: { email: "", password: "" }) { ...F0 }
			second: signIn(input: { email: "", password: "" }) { ...F0 }
		} ${fragments} fragment F${depth} on AuthPayload { user { id } }`;
		const firstId = faker.string.uuid();
		const secondId = faker.string.uuid();

		const result = withTypenames(query, {
			first: { user: { id: firstId } },
			second: { user: { id: secondId } },
		});

		expect(result).toEqual({
			first: {
				__typename: "AuthPayload",
				user: { __typename: "Me", id: firstId },
			},
			second: {
				__typename: "AuthPayload",
				user: { __typename: "Me", id: secondId },
			},
		});
	});

	it.each([
		[
			"a fragment that spreads itself",
			"query Q { me { ...A } } fragment A on Me { id ...A }",
		],
		[
			"two fragments that spread each other",
			"query Q { me { ...A } } fragment A on Me { ...B } fragment B on Me { id ...A }",
		],
	])("rejects %s", (_name, query) => {
		expect(() =>
			withTypenames(query, { me: { id: faker.string.uuid() } }),
		).toThrow(/fragment cycle/);
	});

	it("throws a clear error when a query needs more steps than the budget", () => {
		const aliases = Array.from(
			{ length: 150_000 },
			(_unused, index) => `a${index}: id`,
		).join(" ");

		expect(() =>
			withTypenames(`query Q { me { ${aliases} } }`, {
				me: { id: faker.string.uuid() },
			}),
		).toThrow(/more than 100000 steps/);
	});

	it("shares the traversal budget across the objects of a list", () => {
		const prefix = faker.string.uuid();
		const myOrganizations = Array.from(
			{ length: 60_000 },
			(_unused, index) => ({
				id: `${prefix}-${index}`,
			}),
		);

		expect(() =>
			withTypenames("query Q { myOrganizations { id } }", { myOrganizations }),
		).toThrow(/more than 100000 steps/);
	});

	it("stays within the budget for a large but ordinary query", () => {
		const aliases = Array.from(
			{ length: 20_000 },
			(_unused, index) => `a${index}: id`,
		).join(" ");
		const id = faker.string.uuid();

		const result = withTypenames<{ me: Record<string, unknown> }>(
			`query Q { me { ${aliases} } }`,
			{ me: { id } },
		);

		expect(result.me.__typename).toBe("Me");
		expect(result.me.id).toBe(id);
	});
});
