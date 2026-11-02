import { vi } from "vitest";

/** Stands in for the global `fetch` the HTTP link calls (`vi.stubGlobal("fetch", mockFetch)`). */
export const mockFetch = vi.fn();

/** The next request answers `body` as JSON. */
export function answerFetch(body: unknown): void {
	mockFetch.mockResolvedValueOnce({
		ok: true,
		status: 200,
		headers: { get: () => "application/json" },
		text: async () => JSON.stringify(body),
	});
}

/** Headers of the last request. */
export function sentHeaders(): Record<string, string> {
	return (
		(mockFetch.mock.lastCall?.[1] as { headers?: Record<string, string> })
			?.headers ?? {}
	);
}

/** A GraphQL error with the code the API puts in `extensions`. */
export function graphqlCodeError(message: string, code: string) {
	return { errors: [{ message, extensions: { code } }] };
}
