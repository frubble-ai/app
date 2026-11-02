# Schema

`@frubble/gql` is the single source of truth for the GraphQL API contract.

## Structure

```
schema/                    Type definitions (.graphql)
operations/queries/        Query documents (.graphql)
operations/mutations/      Mutation documents (.graphql)
```

Schema files define the API surface. Operation files define what clients request. Keep them
separate: the schema describes what exists, operations describe what is used.

## Adding to the schema

1. Create or edit a `.graphql` file in the appropriate directory.
2. Run `yarn codegen` to regenerate types for all consumers.

Group related types in the same file (`auth.graphql` holds the types, their inputs, and their
query and mutation fields). Split into a new file when a domain grows large enough to warrant it.
