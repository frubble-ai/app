---
name: testing
description: Rules and required reading for writing or changing tests in any app or package. Use before adding a test, a mock or a data factory.
---

# Testing

## Required reading

- [Test Organization](../../../docs/style-guide/test-organization.md) — where tests, mocks and factories live.
- [Test Quality](../../../docs/style-guide/test-quality.md) — what a good test asserts, the anti-patterns, the checklist.
- [Testing Patterns](../../../docs/style-guide/testing-patterns.md) — each rule shown in a snippet.
- [TypeScript Conventions](../../../docs/typescript/conventions.md) — type prefixes, no single-letter names, Luxon dates.

## Key rules

1. No inline mocks: every mock is a `mock-*.ts` file in `__mocks__/`, imported by the test.
2. Faker generates test data, in `generate-*.ts` factories that take overrides; only a parser or validator test whose exact payload is under test uses a literal.
3. Cases that differ only in their inputs are one `it.each` table, not copied `it` blocks.
4. Test names describe behaviour from the product's point of view, not the implementation.
5. Assert on behaviour the caller sees, never on internal state or which helper ran.
6. Mocks and factories follow the placement rule: beside their one consumer, or in `src/shared/__mocks__/` once there are several.
7. Every test follows Arrange-Act-Assert, and a test that does not fail on a real bug is deleted.
8. Run `yarn test` from the root before saying a test passes.
