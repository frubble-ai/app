import type { TJsonSchema } from "@/use-cases/lib/composio/lib/output-schema";

/**
 * Composio types an organization's `description` as a string, though its own text says it can be
 * null and GitHub sends null for an organization without one (seen 2026-11-03, version
 * 20261103_00). Remove once Composio's schema allows null.
 */
export function allowNullDescription(schema: TJsonSchema): TJsonSchema {
	const defs = schema.$defs as
		| { Organization?: { properties?: Record<string, unknown> } }
		| undefined;
	const description = defs?.Organization?.properties?.description;
	if (!defs?.Organization?.properties || !description) return schema;
	return {
		...schema,
		$defs: {
			...defs,
			Organization: {
				...defs.Organization,
				properties: {
					...defs.Organization.properties,
					description: { anyOf: [description, { type: "null" }] },
				},
			},
		},
	};
}
