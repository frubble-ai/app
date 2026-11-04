import type { TJsonSchema } from "@/use-cases/lib/composio/lib/output-schema";

/**
 * Composio leaves `teams` untyped and types a parallel `items` list, but Linear's answer has the
 * teams in `teams` and `items` empty (seen 2026-11-03). Types `teams` with Composio's own team
 * shape. Remove once Composio's schema types `teams`.
 */
export function typeTeams(schema: TJsonSchema): TJsonSchema {
	const defs = schema.$defs as
		| { ListLinearTeamsResponse?: { properties?: Record<string, unknown> } }
		| undefined;
	const response = defs?.ListLinearTeamsResponse;
	if (!response?.properties?.teams || !defs) return schema;
	return {
		...schema,
		$defs: {
			...defs,
			ListLinearTeamsResponse: {
				...response,
				properties: {
					...response.properties,
					teams: {
						...(response.properties.teams as TJsonSchema),
						items: { $ref: "#/$defs/ListLinearTeamsResponseSingleItem" },
					},
				},
			},
		},
	};
}
