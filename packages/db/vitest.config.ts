import { defineConfig } from "vitest/config";
import { coverage } from "../../vitest.shared.ts";

export default defineConfig({
	test: {
		environment: "node",
		globals: true,
		coverage: {
			...coverage,
			// The schema, the client and the migrations run under the backend's
			// integration tests; what is left here is the env parsing.
			exclude: [...coverage.exclude, "src/schema/**", "src/lib/client.ts"],
		},
	},
});
