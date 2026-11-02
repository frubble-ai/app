# App

`apps/app` is the customers' web app, at `app.<env>.frubble.ai`. Today it signs a customer up, in
and out, resets a forgotten password, and shows a home page.

## Stack, and why

| Choice | Why |
|---|---|
| Next.js 16, App Router | The SDK is React (Apollo hooks) |
| Its own server (`output: "standalone"`) | The image runs `node server.js` on port 3000 (Dockerfile): no web server or config of ours in front of it. The security headers are in `next.config.ts` |
| Pages render in the browser | The session is a bearer token in `localStorage`, so the server has nothing to render: `AppProviders` shows the splash screen until the session has loaded, and each page is a client component (`"use client"`) |
| `@frubble/react-sdk` | The typed client, hooks and `useAuth`; the app gives it a `localStorage` token store (`src/shared/token-store`, [client](../graphql/client.md#session-token-storage)) |
| Plain HTML, one small stylesheet | No component library, palette or theme: `src/app/app.css` lays out the page and leaves fonts and colors to the browser |

## Dependencies

Each was at least three days old when picked, as `.yarnrc.yml`'s age gate requires.

| Package | For |
|---|---|
| `next` | Routing, the build, the server |
| `@apollo/client`, `graphql`, `rxjs` | `ApolloProvider` and the error types; `graphql` and `rxjs` are Apollo's peers |
| `i18next`, `react-i18next` | Translations |
| `zod` | The runtime config (`src/config/app-config`) |
| `@vitejs/plugin-react` | JSX in Vitest (Next only builds) |
| `@testing-library/user-event`, `-dom`, `-jest-dom` | Driving and asserting on the DOM in tests |

## Structure

The repo's rules apply ([placement](../style-guide/placement-rule.md), [imports](../style-guide/imports.md),
[tests](../style-guide/test-organization.md)):

```
apps/app/
├── next.config.ts           # standalone server, workspace packages from source, headers
├── AGENTS.md                # Next's, written by `next dev`
├── Dockerfile
└── src/
    ├── proxy.ts             # Next's: each page's Content-Security-Policy
    ├── app/                 # Next's: layout.tsx (reads the runtime config), error.tsx, app.css, (signed-in)/, one page.tsx per path
    ├── config/              # app-config (the container's environment), sdk (configureGraphql + the token store)
    ├── i18n/                # setup, resources/en/<domain>.json, lib/i18next.d.ts (typed keys)
    ├── screens/<name>/      # what a route shows: index.tsx, hooks/, lib/, __tests__/, __mocks__/
    ├── shared/
    │   ├── components/      # app-shell, auth-guard, role-fallback, page-head, code-flow-error…
    │   ├── code-flow/       # what a failed sign-up or reset step shows
    │   ├── session/         # boot and end a session
    │   ├── token-store/     # localStorage, for the SDK
    │   └── graphql-error/   # the API's error code and message
    └── testing/             # mocks.ts (global), testing.tsx (renderWithProviders), mock-*, generate-*
```

- A page (`page.tsx`) renders its screen and nothing else; `src/app/__tests__/pages.test.tsx` checks
  that, with each screen's `__mocks__/index.tsx`.
- `src/app/(signed-in)/layout.tsx` wraps every page behind sign-in in `AuthGuard` (signed in,
  `customer`; an admin gets `RoleFallback`, which only signs out) and `AppShell`.
- Signed out: `/sign-in`, `/sign-up` and `/reset-password`. Sign-up and the reset are two steps on
  one page: the email, which the API sends a code to, then the code with a name and a password, or
  with the new password ([sign-in](../auth.md)). After a reset the user signs in again, since the
  reset revokes every session.
- Loading: until the saved session has loaded, `AppProviders` shows the splash screen, which is
  also all the server sends. After that, a signed-in page shows the frame at once with a loading
  state while the API says who is signed in.
- Runtime config: one image serves every environment. The root layout reads `APP_ENV` and
  `GRAPHQL_URL` from the container at request time (`await connection()`) and hands them to
  `AppProviders`, which applies them (`appConfig`) and points the SDK at the API before the session
  loads ([environment](../environment.md#app)).
- Content-Security-Policy: the session token sits in `localStorage`, so `src/proxy.ts` gives every
  page a policy built per request from the runtime config, with a fresh nonce Next puts on its own
  scripts. Only the page's scripts and what they load run (`strict-dynamic`), and it talks only to
  its origin and its API. `next dev` adds `unsafe-eval`, which React's dev build needs; stg and prd
  add `upgrade-insecure-requests`. The other headers are `next.config.ts`'s.
- A page that reads the URL's query (`useSearchParams`: sign-in's `?from=` and `?reset=`) is
  wrapped in `<Suspense>`, as Next requires; a redirect is `<Redirect to>`
  (`src/shared/components/redirect`), Next's `router.replace` once it renders.

## i18n

As the [style guide](../style-guide/i18n.md): one namespace per domain (`auth`, `home`, `layout`),
bundled. `src/i18n/lib/i18next.d.ts` types every key against the English files, so a typo fails the
typecheck. Tests render `namespace.key`.

## Testing

Vitest with jsdom. Every element a test reaches carries a `data-testid` and tests query by it.
`src/testing/mocks.ts` loads jest-dom and the i18n mock; the SDK's hooks are mocked per file with
`vi.mock("@frubble/react-sdk", async () => import("@/testing/mock-react-sdk"))`.

Routing is never mocked: `renderWithProviders(ui, { path, routes })` (`src/testing/testing.tsx`)
renders the page under Next's own router contexts (`AppRouterContext`, `PathnameContext`,
`SearchParamsContext`), so `useRouter`, `usePathname`, `useSearchParams` and `next/link` are Next's
real code ([pattern](https://github.com/vercel/next.js/discussions/48937)). Only the router
instance is the test's: `push` and `replace` are spies that move the URL, and a path in `routes`
renders a `route-<path>` marker, so a test sees where a redirect went (`location()` gives the
URL). A link is checked by its `href`: following a click is Next's own navigation, outside jsdom.

## Running it

```bash
yarn dev                               # the API, the worker and the app, on http://localhost:3000
yarn workspace @frubble/app dev        # the app alone, against your local API
yarn workspace @frubble/app test
```

The local API must allow the app's origin: `CORS_ORIGIN` includes `http://localhost:3000`
(`apps/backend/.env.example`). To use stg's API instead, set `GRAPHQL_URL` in
`apps/app/.env.local` ([environment](../environment.md#app)).

Deploying: [deployment](../deployment.md#app).
