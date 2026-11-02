# Code Generation

`@frubble/gql` is the single generated source of truth. Its codegen produces, once, from the
schema:

- `@frubble/gql/types`: every schema type, enum, input and scalar
- `@frubble/gql/validation`: zod schemas for every input

Consumers import those and generate only what is specific to them:

| Consumer             | Generates                                                                                | Imports                                         |
| -------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `apps/backend`       | Resolver signatures (`typescript-resolvers`)                                             | `@frubble/gql/types`, `@frubble/gql/validation` |
| `packages/react-sdk` | Typed documents and Apollo Client hooks for the app's operations ([client](./client.md)) | `@frubble/gql/types` (re-exported)              |

The generated types use the wire format for scalars (`DateTime` is a string).

Client bundles import the `types` and `validation` subpaths only, never the package root (which
reads `.graphql` files from disk).

## When to run

Run `yarn codegen` after any change to `.graphql` files. Turbo runs the gql codegen before its
consumers, and before `typecheck`, `test`, `dev` and `build`. Generated files are never committed,
neither the gql package's nor the API's nor the SDK's, so a script run directly with `yarn workspace` on
a fresh checkout needs `yarn codegen` first.
