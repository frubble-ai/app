/** Any origin works: a path is resolved against it only to see whether it stays on it. */
const SITE = "https://app.invalid";

/**
 * Where to go after sign-in: the page the guard sent them from (`?from=`), when it's a path on this
 * site; home otherwise. It's resolved as a browser would, which strips tabs and newlines and reads a
 * backslash as a slash, so `//host`, `/\host` and `/<tab>/host` are other sites and refused; what
 * comes back is the resolved path, not the raw value.
 */
export function returnPath(from: string | null): string {
	if (!from?.startsWith("/")) return "/";
	const url = new URL(from, SITE);
	if (url.origin !== SITE) return "/";
	return `${url.pathname}${url.search}${url.hash}`;
}
