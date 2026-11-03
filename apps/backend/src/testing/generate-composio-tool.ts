import { faker } from "@faker-js/faker";

/**
 * `GET /api/v3.1/tools/{slug}` as Composio answers it, with the given output `data` schema and its
 * `$defs` placed the way Composio places them.
 */
export function generateComposioTool(args: {
	slug: string;
	data: Record<string, unknown>;
	defs?: Record<string, unknown>;
}) {
	const toolkit = args.slug.split("_")[0]?.toLowerCase() ?? "github";
	const version = `${faker.date.past().toISOString().slice(0, 10).replaceAll("-", "")}_00`;
	return {
		slug: args.slug,
		name: faker.lorem.words(3),
		toolkit: { slug: toolkit, name: toolkit, logo: faker.internet.url() },
		description: faker.lorem.sentence(),
		input_parameters: { type: "object", properties: {}, required: [] },
		output_parameters: {
			type: "object",
			title: "Response",
			required: ["data", "successful"],
			properties: {
				data: args.data,
				error: { type: "string", nullable: true },
				successful: { type: "boolean" },
			},
			...(args.defs ? { $defs: args.defs } : {}),
		},
		tags: ["readOnlyHint"],
		available_versions: [version],
		version,
		scopes: [],
		scope_requirements: {},
		is_deprecated: false,
		deprecated: {
			is_deprecated: false,
			version,
			available_versions: [version],
		},
		no_auth: false,
	};
}
