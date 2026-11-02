import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { coverage } from "../../vitest.shared.ts";

// Next builds the app; tests render screens and pages with plain React, under Next's router contexts
export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: { "@": path.resolve(import.meta.dirname, "src") },
		dedupe: ["react", "react-dom", "@apollo/client", "graphql"],
	},
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./src/testing/mocks.ts"],
		coverage: {
			...coverage,
			// Framework entrypoints with nothing of ours to test
			exclude: [...coverage.exclude, "src/app/layout.tsx", "src/app/error.tsx"],
		},
	},
});
