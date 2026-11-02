import path from "node:path";
import type { NextConfig } from "next";

/**
 * What every page answers with: no sniffing, no framing, no indexing. The Content-Security-Policy is
 * src/proxy.ts's, built per request from the runtime config with a fresh nonce.
 */
const SECURITY_HEADERS = [
	{ key: "X-Content-Type-Options", value: "nosniff" },
	{ key: "X-Frame-Options", value: "DENY" },
	{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
	{ key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const config = {
	// The image runs Next's own server (`node server.js`, Dockerfile): no web server in front of it
	output: "standalone",
	// The monorepo root, so the standalone build carries the workspace packages it imports
	outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
	// Workspace packages ship TypeScript source
	transpilePackages: ["@frubble/gql", "@frubble/react-sdk"],
	poweredByHeader: false,
	async headers() {
		return [{ source: "/:path*", headers: SECURITY_HEADERS }];
	},
} satisfies NextConfig;

export default config;
