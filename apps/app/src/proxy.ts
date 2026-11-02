import { type NextRequest, NextResponse } from "next/server";
import { buildAppConfig, type TAppConfig } from "@/config/app-config";

/**
 * The page's Content-Security-Policy. The session token sits in `localStorage`, so only the page's
 * own scripts may run (the nonce Next puts on its scripts, and what they load: `strict-dynamic`), and
 * it may only talk to its origin and its API. Styles allow inline: the components set `style`
 * attributes, which a nonce can't cover. Development adds `unsafe-eval`, which React's dev build
 * needs.
 */
export function contentSecurityPolicy(
	config: TAppConfig,
	nonce: string,
	dev: boolean,
): string {
	const api = new URL(config.graphqlUrl);
	return [
		"default-src 'self'",
		`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' blob: data:",
		"font-src 'self' data:",
		`connect-src 'self' ${api.origin}`,
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'none'",
		// Locally the API is plain HTTP, which this would break
		...(config.appEnv === "local" ? [] : ["upgrade-insecure-requests"]),
	].join("; ");
}

/**
 * Every page: its Content-Security-Policy, built per request with a fresh nonce from the runtime
 * config (Next applies the nonce to its own scripts).
 */
export function proxy(request: NextRequest) {
	const config = buildAppConfig(process.env);
	const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
	const policy = contentSecurityPolicy(
		config,
		nonce,
		process.env.NODE_ENV === "development",
	);
	const requestHeaders = new Headers(request.headers);
	requestHeaders.set("Content-Security-Policy", policy);
	const response = NextResponse.next({ request: { headers: requestHeaders } });
	response.headers.set("Content-Security-Policy", policy);
	return response;
}

export const config = {
	// Pages, prefetches included: not Next's own files
	matcher: ["/((?!_next/|favicon\\.ico).*)"],
};
