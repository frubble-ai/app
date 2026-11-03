import { defineConfig } from "vitest/config";
import { coverage } from "../../vitest.shared.ts";

export default defineConfig({
	test: {
		environment: "node",
		globals: true,
		include: ["src/**/*.test.{ts,tsx}", "codegen/**/*.test.ts"],
		coverage: {
			...coverage,
			// Codegen output (codegen.yml), outside a `__generated__` folder: one hook per operation.
			exclude: [
				...coverage.exclude,
				"src/gql/documents.ts",
				"src/gql/operations.ts",
				"src/gql/generated.ts",
			],
		},
	},
});
