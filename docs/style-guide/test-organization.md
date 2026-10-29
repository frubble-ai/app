# Test Organization

Where tests, mocks and factories live, and the rules every test follows.
[Test Quality](./test-quality.md) covers what a good test asserts;
[Testing Patterns](./testing-patterns.md) shows each rule in code.

## Test runner

1. **vitest, in every workspace.** Each workspace has a `vitest.config.ts` that uses the
   shared coverage config from `vitest.shared.ts`. `yarn test` runs them all; `yarn
   test:coverage` also merges coverage into `coverage/` at the root.

## Structure

> `src/` here means per app or package: `apps/<app>/src/`, `packages/<package>/src/`.

2. **Any folder with source may have `__tests__/` and `__mocks__/` beside it.**

   ```
   users/
   ├── index.ts
   ├── __mocks__/
   │   ├── generate-user.ts
   │   └── mock-create-user-use-case.ts
   └── __tests__/
       └── users.test.ts
   ```

3. **`__mocks__/` holds two kinds of file, and the name says which:**
   - `mock-*.ts` — behaviour replacements: `mock-posthog-capture.ts`, `mock-clock.ts`, and
     `mock-<name>-use-case.ts` for a use case another module calls, such as
     `mock-create-user-use-case.ts`.
   - `generate-*.ts` — data factories: `generate-user.ts`, `generate-order.ts`,
     `generate-expired-token.ts`.

4. **Mocks and factories follow the [placement rule](./placement-rule.md).** One consumer →
   the `__mocks__/` beside it. Several → the nearest shared ancestor, or
   `src/shared/__mocks__/`.

5. **Shared test setup lives in `src/testing/`**: a request helper that calls the app, a
   database reset, global mocks every test needs.

## Mock rules

6. **No inline mocks in tests.** Every mock is a file in `__mocks__/` that the test imports.
   A test never defines a mock implementation itself.

7. **Every factory uses faker.** No hardcoded test data: `@faker-js/faker` generates every
   value, and a test overrides only the fields that matter to it. faker is not installed yet:
   the first workspace that writes a factory adds `@faker-js/faker` to its `devDependencies`.

## Test rules

8. **Parametrize with `it.each`.** Cases that differ only in input and expected output are one
   table, not several copied `it` blocks.

9. **Randomize inputs.** Generate them with faker, so a test does not pass only for the one
   value it was written with. **Exception:** a parser or validator test whose exact payload is
   the thing under test uses a hardcoded literal.
