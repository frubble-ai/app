import { jsonSchemaToZod } from "@composio/json-schema-to-zod/v4";
import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { typeTeams } from "@/use-cases/lib/composio/linear/output-patch";

/** LINEAR_LIST_LINEAR_TEAMS's `data` as Composio defines it: `teams` with untyped items. */
function composioSchema() {
	return {
		$ref: "#/$defs/ListLinearTeamsResponse",
		$defs: {
			ListLinearTeamsResponse: {
				type: "object",
				properties: {
					items: {
						type: "array",
						items: { $ref: "#/$defs/ListLinearTeamsResponseSingleItem" },
					},
					teams: { type: "array", items: {} },
				},
				required: ["teams"],
			},
			ListLinearTeamsResponseSingleItem: {
				type: "object",
				properties: {
					id: { type: "string" },
					name: { type: "string" },
					members: { type: "array", items: {} },
					projects: { type: "array", items: {} },
				},
				required: ["id", "name", "members", "projects"],
			},
		},
	};
}

function linearTeam() {
	return {
		id: faker.string.uuid(),
		name: faker.company.name(),
		members: [],
		projects: [],
	};
}

describe("typeTeams", () => {
	it("types Linear's teams with Composio's own team shape", () => {
		const schema = jsonSchemaToZod(typeTeams(composioSchema()) as never);

		expect(schema.safeParse({ items: [], teams: [linearTeam()] }).success).toBe(
			true,
		);
		expect(
			schema.safeParse({
				items: [],
				teams: [{ ...linearTeam(), name: undefined }],
			}).success,
		).toBe(false);
	});

	it("leaves a schema without teams as it is", () => {
		const schema = { $defs: { Other: { type: "object" } } };

		expect(typeTeams(schema)).toBe(schema);
	});
});
