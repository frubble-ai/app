# Style Guide

Rules for every app and package, whatever its framework.

## Structure

| Guide                                                     | What it covers                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------ |
| [Placement Rule](./placement-rule.md)                     | where a unit lives: colocated, nested or shared, and what a module holds |
| [Imports](./imports.md)                                   | `@/` for anything outside the folder, `./` for siblings, never `../`     |
| [Packages](./packages.md)                                 | when code moves to `packages/`, flat exports, the `testing` subpath      |
| [Third-Party Integrations](./third-party-integrations.md) | one folder per library, mirroring the app's domains                      |

## Testing

| Guide                                       | What it covers                                             |
| ------------------------------------------- | ---------------------------------------------------------- |
| [Test Organization](./test-organization.md) | where tests, mocks and factories live, faker, `it.each`    |
| [Test Quality](./test-quality.md)           | what a good test asserts, the anti-patterns, the checklist |
| [Testing Patterns](./testing-patterns.md)   | each testing rule shown in a short snippet                 |

## See also

- [TypeScript Conventions](../typescript/conventions.md) — naming, no single-letter names,
  dates with Luxon.
- [Monorepo](../monorepo.md) — the workspace layout and how to add an app or a package.
