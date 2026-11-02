import { defineConfig } from "vitest/config";
import { coverage } from "../../vitest.shared.ts";

export default defineConfig({
	test: {
		environment: "node",
		globals: true,
		coverage: {
			...coverage,
			// Needs a Pub/Sub topic; the deployed worker is its test.
			exclude: [...coverage.exclude, "src/adapters/pubsub/**"],
		},
	},
});
