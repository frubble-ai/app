# Client

The app consumes GraphQL through `@frubble/react-sdk`, on Apollo Client.

## Why Apollo

One normalized cache that every query and mutation writes to: a mutation that returns the user
shows on every screen reading them, with no invalidation by hand. The app imports `@apollo/client`
itself (`ApolloProvider`, the error types), so it also lists Apollo's peers `graphql` and `rxjs`.

## Endpoint configuration

The app calls `configureGraphql({ endpoint, onUnauthenticated })` at startup, before any
operation. The endpoint comes from the runtime config ([app](../app/index.md)).

## Session token storage

The SDK holds the session token in memory, for the client's synchronous reads, and persists it in a
store the app gives it: `configureTokenStore({ getItem, setItem, deleteItem })` (`TTokenStore`),
called at startup beside `configureGraphql`. The SDK depends on no platform storage module, so the
app injects its own: the browser's `localStorage`, in `apps/app/src/shared/token-store`.

`loadToken()` reads the persisted token into memory as the app opens. Without a store (unit tests)
the token lives in memory only, and a store that fails (storage blocked) leaves the session in
memory for the page's life.

Changing the password revokes every session, the caller's too, and the API answers with a new
token: `changePassword` stores it in place of the old one.

## What codegen generates

From `packages/gql/operations/**` (`packages/react-sdk/codegen.yml`):

| File | Contents |
|---|---|
| `src/gql/documents.ts` | Operation types and a typed document per operation (`MeDocument`, `SignInDocument`) |
| `src/gql/generated.ts` | A hook per operation: `useMeQuery`, `useSignInMutation` (`codegen/react-apollo-hooks.cjs`: typescript-react-apollo minus its suspense hooks, which don't type against Apollo Client 4, and minus an import nothing then uses) |
| `src/testing/__generated__/schema.json` | The schema's introspection, for `withTypenames` |

Import them from `@frubble/react-sdk`, not from generated files.

## Using it

- In components: `useAuth` and the generated hooks.
- Outside components: `graphqlClient` with a typed document.
- Queries default to `cache-and-network`: a screen that mounts shows the cache and asks again. `Me`
  in `useAuth` reads `cache-first`: signing in and up refetch it.

## Error handling

A response with GraphQL errors rejects with Apollo's `CombinedGraphQLErrors`; read codes from
`error.errors[i].extensions.code`. When the API refuses the session token that was sent
(`UNAUTHENTICATED`), the client calls `onUnauthenticated`.
