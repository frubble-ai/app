import {
	type JsonSchema,
	jsonSchemaToZod,
} from "@composio/json-schema-to-zod/v4";
import type { ZodType } from "zod";
import type { TComposio } from "@/composio";

/** A JSON Schema as Composio serves it: an object whose shape we don't model. */
export type TJsonSchema = Record<string, unknown>;

/** Fixes one tool's output schema where Composio's is wrong; returns the schema to use. */
export type TSchemaPatch = (schema: TJsonSchema) => TJsonSchema;

const schemas = new Map<string, Promise<ZodType>>();

/**
 * The Zod schema of a tool's `data`, built from Composio's own output schema (latest version, as
 * sessions run) with Composio's converter. Kept per process and tool; `refresh` fetches it again,
 * for when a session has moved to a newer toolkit version.
 */
export function toolOutputSchema(
	composio: TComposio,
	slug: string,
	patch?: TSchemaPatch,
	options: { refresh?: boolean } = {},
): Promise<ZodType> {
	const cached = options.refresh ? undefined : schemas.get(slug);
	if (cached) return cached;
	const built = composio.tools
		.getRawComposioToolBySlug(slug)
		.then((tool) => {
			const output = tool.outputParameters as TJsonSchema & {
				properties?: { data?: TJsonSchema };
				$defs?: TJsonSchema;
			};
			const data = { ...output.properties?.data, $defs: output.$defs };
			// Composio serves JSON Schema; its converter takes the same shape.
			return jsonSchemaToZod((patch ? patch(data) : data) as JsonSchema);
		})
		.catch((err: unknown) => {
			schemas.delete(slug);
			throw err;
		});
	schemas.set(slug, built);
	return built;
}
