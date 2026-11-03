// The organization the viewer last worked in, per browser. A convenience: the API checks
// membership on every call, so a stale or foreign id only shows nothing.

const KEY = "frubble.currentOrganizationId";

export function readCurrentOrganizationId(): string | null {
	try {
		return localStorage.getItem(KEY);
	} catch {
		return null;
	}
}

export function writeCurrentOrganizationId(id: string): void {
	try {
		localStorage.setItem(KEY, id);
	} catch {
		// Storage blocked: the app falls back to the first organization.
	}
}
