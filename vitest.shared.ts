import type { CoverageOptions } from "vitest/node";

// Coverage every workspace measures the same way. `json` writes
// coverage-final.json, which bin/merge-coverage.mjs combines into the root
// report that fallow reads in CI.
export const coverage = {
	provider: "istanbul",
	reporter: ["text", "json", "json-summary", "html"],
	include: ["src/**/*.{ts,tsx}"],
	exclude: [
		"src/**/__mocks__/**",
		"src/**/__tests__/**",
		"src/testing/**",
		"src/index.ts",
	],
	thresholds: {
		statements: 50,
		branches: 50,
		functions: 50,
		lines: 50,
	},
} satisfies CoverageOptions;
