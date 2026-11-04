import frubblePlugin from "@frubble/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

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
	{
		// Composio is one broker among those that could be: only its own folder knows it, and
		// everything else reaches it through `createComposioBroker` (docs/integrations.md).
		files: ["apps/backend/src/**/*.{ts,tsx}"],
		ignores: ["apps/backend/src/composio/**"],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group: ["@composio/*"],
							message:
								"Only src/composio/ talks to Composio; use a broker from ctx.integrations.",
						},
						{
							group: ["@/composio/*"],
							message:
								"src/composio/ is reached through its index, `createComposioBroker`.",
						},
					],
				},
			],
			// The same boundary for `import("…")`, which no-restricted-imports does not see.
			"no-restricted-syntax": [
				"error",
				{
					selector:
						"ImportExpression[source.type='Literal'][source.value=/^@composio\\//]",
					message:
						"Only src/composio/ talks to Composio; use a broker from ctx.integrations.",
				},
				{
					selector:
						"ImportExpression[source.type='Literal'][source.value=/^@\\/composio\\//]",
					message:
						"src/composio/ is reached through its index, `createComposioBroker`.",
				},
			],
		},
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
