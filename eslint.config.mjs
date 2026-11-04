import frubblePlugin from "@frubble/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

// Each integration broker in the backend: its folder, and the libraries only that folder imports
// (docs/integrations.md, "Brokers"). A new broker is a new entry.
const BROKERS = [{ folder: "composio", libraries: ["@composio"] }];

/** `text` as it reads inside an esquery regex literal. */
function regexSource(text) {
	return text.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

/**
 * Refuses the brokers' libraries and any path into their folders, by `import` and by `import("…")`
 * (a string or a template without expressions), which no-restricted-imports does not see.
 */
function brokerBoundary(brokers) {
	const refused = brokers.flatMap((broker) => [
		...broker.libraries.map((library) => ({
			prefix: `${library}/`,
			message: `Only src/${broker.folder}/ imports ${library}/*; use a broker from ctx.integrations.`,
		})),
		// By the alias, or from `src/` itself by a relative path into the folder.
		...[`@/${broker.folder}/`, `./${broker.folder}/`].map((prefix) => ({
			prefix,
			message: `src/${broker.folder}/ is reached through its index.`,
		})),
	]);
	return {
		"no-restricted-imports": [
			"error",
			{
				patterns: refused.map(({ prefix, message }) => ({
					group: [`${prefix}*`],
					message,
				})),
			},
		],
		"no-restricted-syntax": [
			"error",
			...refused.flatMap(({ prefix, message }) => {
				const pattern = `/^${regexSource(prefix)}/`;
				return [
					{
						selector: `ImportExpression[source.type='Literal'][source.value=${pattern}]`,
						message,
					},
					{
						selector: `ImportExpression[source.type='TemplateLiteral'][source.expressions.length=0][source.quasis.0.value.cooked=${pattern}]`,
						message,
					},
				];
			}),
		],
	};
}

export default [
	{
		ignores: [
			"**/node_modules/**",
			"**/dist/**",
			"**/coverage/**",
			"**/.turbo/**",
			"**/__generated__/**",
			"**/.next/**",
			"**/next-env.d.ts",
			// The SDK's codegen output (packages/react-sdk/codegen.yml)
			"packages/react-sdk/src/gql/documents.ts",
			"packages/react-sdk/src/gql/operations.ts",
			"packages/react-sdk/src/gql/generated.ts",
		],
	},
	{
		files: ["**/*.{ts,tsx}"],
		languageOptions: {
			parser: tsParser,
		},
		rules: {
			// A name says what a value is. `t` is the translation function by
			// convention, `_` marks a value that is deliberately unused.
			"id-length": ["error", { min: 2, exceptions: ["t", "_"] }],
		},
	},
	{
		files: ["apps/*/src/**/*.{ts,tsx}"],
		...frubblePlugin.configs.recommended,
	},
	// Outside the broker folders, no broker is reachable but through its index.
	{
		files: ["apps/backend/src/**/*.{ts,tsx}"],
		ignores: BROKERS.map((broker) => `apps/backend/src/${broker.folder}/**`),
		rules: brokerBoundary(BROKERS),
	},
	{
		files: ["packages/*/src/**/*.{ts,tsx}"],
		plugins: { "@frubble": frubblePlugin },
		rules: {
			"@frubble/kebab-case-folders": "error",
			"@frubble/folder-structure": "error",
		},
	},
];
