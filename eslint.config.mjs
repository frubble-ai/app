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
		files: ["packages/*/src/**/*.{ts,tsx}"],
		plugins: { "@frubble": frubblePlugin },
		rules: {
			"@frubble/kebab-case-folders": "error",
			"@frubble/folder-structure": "error",
		},
	},
];
