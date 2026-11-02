# @frubble/react-sdk

Typed React client for the GraphQL surface, on Apollo Client: typed documents, generated hooks, `graphqlClient`, auth.

| Export                       | Used by | What                                                                                                                                      |
| ---------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `@frubble/react-sdk`         | app     | `useAuth`, `configureGraphql`, `configureTokenStore`, `graphqlClient`, `clearSession`, the schema types, typed documents, generated hooks |
| `@frubble/react-sdk/testing` | app     | `withTypenames`, for mocked responses shaped as the API sends them                                                                        |

Schema types and enums are re-exported from `@frubble/gql/types`. Run `yarn codegen` to regenerate documents and hooks from `packages/gql`.
