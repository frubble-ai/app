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
	let url: URL;
	try {
		url = new URL(from, SITE);
	} catch {
		// Not a URL at all (`//[`): nowhere to go back to
		return "/";
	}
	if (url.origin !== SITE) return "/";
	const path = `${url.pathname}${url.search}${url.hash}`;
	// A path can resolve to one that starts `//` (`/.//host`): the browser reads that as another
	// site when it navigates, so what comes back is checked once more the same way
	return path.startsWith("//") || new URL(path, SITE).origin !== SITE
		? "/"
		: path;
}

/** `path` carrying the page to return to, so it survives a hop between sign-in and sign-up. */
export function withFrom(path: string, from: string | null): string {
	return from ? `${path}?${new URLSearchParams({ from })}` : path;
}
