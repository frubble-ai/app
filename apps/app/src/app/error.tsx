"use client";

/** What a page shows when it fails to render. */
export default function ErrorPage({ error }: { readonly error: Error }) {
	return (
		<main>
			<h1>Something went wrong</h1>
			<p>{error.message}</p>
		</main>
	);
}
