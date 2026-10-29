import { defineConfig } from "vitest/config";
import { coverage } from "../../vitest.shared.ts";

export default defineConfig({
	test: {
		environment: "node",
		globals: true,
		coverage,
	},
});
