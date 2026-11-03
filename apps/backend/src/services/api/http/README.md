# HTTP routes

The API's surface beside GraphQL: where an outside service sends the browser back.

## Folders spell the URL

Every route lives at the path its folder under `routes/` spells, one folder per path segment:

```
routes/
  integrations/
    callback/               /integrations/callback
```

- A route's `index.ts` exports `create…Routes(): Hono` and answers at its own `/`. A deeper path is
  a folder inside it, with its own `index.ts`, never a second path in the parent.
- A folder that only groups (`integrations/`) holds no route of its own and no `index.ts`.
- `index.ts` here mounts each route at its folder's path (`ROUTES`). A new route is a new folder
  plus one line in `ROUTES`.
- A route's `__tests__/` and `__mocks__/` sit in its own folder. Tests call `buildHttp()` with the
  real URL, so a path that doesn't match its folder fails.

A route reads the request, calls one use case and picks the response.
