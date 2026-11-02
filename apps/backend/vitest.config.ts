import path from "node:path";
import { defineConfig } from "vitest/config";
import { coverage } from "../../vitest.shared.ts";

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
	test: {
		environment: "node",
		globals: true,
		// One Postgres container per run, cloned per test (src/testing).
		globalSetup: ["./src/testing/global-setup.ts"],
		testTimeout: 60_000,
		hookTimeout: 120_000,
		coverage,
	},
});
