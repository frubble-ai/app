import { type RenderOptions, render } from "@testing-library/react";
// Next's own router contexts, which `useRouter`, `usePathname` and `useSearchParams` read: a page
// under test runs Next's real hooks, with only the router instance given here
// (github.com/vercel/next.js/discussions/48937)
import {
	AppRouterContext,
	type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
	PathnameContext,
	SearchParamsContext,
} from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { type ReactElement, useState } from "react";
import { vi } from "vitest";

type TRenderOptions = Omit<RenderOptions, "wrapper"> & {
	/** The URL the page renders at; `/` when absent. */
	path?: string;
	/** Other paths the page can send the user to, each rendering its `data-testid`. */
	routes?: string[];
};

type TBrowserProps = {
	readonly ui: ReactElement;
	readonly start: URL;
	readonly page: string;
	readonly routes: readonly string[];
	readonly router: AppRouterInstance;
	/** Hands the test the setter that moves the URL. */
	readonly onShow: (show: (next: URL) => void) => void;
};

/** The page under Next's router contexts, or the marker of the route it moved to. */
function Browser({ ui, start, page, routes, router, onShow }: TBrowserProps) {
	const [current, setCurrent] = useState(start);
	onShow(setCurrent);
	const elsewhere =
		current.pathname !== page && routes.includes(current.pathname);
	return (
		<AppRouterContext.Provider value={router}>
			<PathnameContext.Provider value={current.pathname}>
				<SearchParamsContext.Provider value={current.searchParams}>
					{elsewhere ? <div data-testid={`route-${current.pathname}`} /> : ui}
				</SearchParamsContext.Provider>
			</PathnameContext.Provider>
		</AppRouterContext.Provider>
	);
}

/**
 * Renders `ui` as the page at `path`, under Next's router contexts. `router.push` and `replace` move
 * the URL: sent to a path in `routes`, the page gives way to a marker
 * (`data-testid="route-<path>"`), so a test sees where it sent them; `location()` gives the URL.
 */
export function renderWithProviders(
	ui: ReactElement,
	{ path = "/", routes = [], ...options }: TRenderOptions = {},
) {
	let url = new URL(path, "http://app.test");
	const page = url.pathname;
	let show: (next: URL) => void = () => {};
	const go = (href: string) => {
		url = new URL(href, url);
		show(url);
	};
	const router: AppRouterInstance = {
		back: vi.fn(),
		forward: vi.fn(),
		refresh: vi.fn(),
		prefetch: vi.fn(),
		push: vi.fn(go),
		replace: vi.fn(go),
		bfcacheId: "test",
	};

	return {
		router,
		location: () => ({ pathname: url.pathname, search: url.search }),
		...render(
			<Browser
				ui={ui}
				start={url}
				page={page}
				routes={routes}
				router={router}
				onShow={(setter) => {
					show = setter;
				}}
			/>,
			options,
		),
	};
}
