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
});
