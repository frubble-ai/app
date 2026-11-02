"use client";

/** What a page shows when it fails to render; `reset` renders the failed part again. */
export default function ErrorPage({
	error,
	reset,
}: {
	readonly error: Error;
	readonly reset: () => void;
}) {
	return (
		<main>
			<h1>Something went wrong</h1>
			<p>{error.message}</p>
			<button type="button" onClick={reset}>
				Try again
			</button>
		</main>
	);
}
