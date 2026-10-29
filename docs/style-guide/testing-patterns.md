# Testing Patterns

The companion to [Test Organization](./test-organization.md) and
[Test Quality](./test-quality.md). Those define the rules; this page shows each one in a
short snippet. The snippets use vitest and Hono, as `apps/backend` does.

## A factory in `__mocks__/`, with faker and overrides

Every `generate-*.ts` builds a valid value with faker and lets the test override only the
fields it cares about. faker is not installed yet: the workspace that writes the first
factory adds `@faker-js/faker` to its `devDependencies`.

```ts
// src/users/__mocks__/generate-user.ts
import { faker } from "@faker-js/faker";
import type { IUser } from "@/shared/users";

export function generateUser(overrides: Partial<IUser> = {}): IUser {
	return {
		id: faker.string.uuid(),
		email: faker.internet.email(),
		name: faker.person.fullName(),
		...overrides,
	};
}
```

A `mock-*.ts` file replaces a behaviour the same way: a function that returns the mock, with
defaults a test can override.

```ts
// src/users/__mocks__/mock-create-user-use-case.ts
import { vi } from "vitest";
import { generateUser } from "./generate-user";

export function mockCreateUserUseCase(overrides = {}) {
	return {
		execute: vi.fn().mockResolvedValue(generateUser()),
		...overrides,
	};
}
```

## Anti-pattern: an inline mock

```ts
// bad — the mock is defined in the test, with hardcoded data
const createUser = {
	execute: vi.fn().mockResolvedValue({
		id: "user-1", // magic string
		email: "john@test.com", // magic string
		name: "John", // magic string
	}),
};
```

Fix: `mockCreateUserUseCase()` from `__mocks__/`. One line, faker randomizes the data, and an
override sets the one field the test is about.

**Exception:** a test of a parser or a validator, where the exact payload *is* the thing under
test. A hardcoded literal is right there.

## `it.each` instead of copied tests

Cases that share a body and differ only in their inputs are one table.

```ts
it.each([
	{ label: "a request without an email is refused", body: { email: "" }, status: 400 },
	{ label: "a request with an invalid email is refused", body: { email: faker.lorem.word() }, status: 400 },
	{ label: "a request with a valid email is accepted", body: { email: faker.internet.email() }, status: 201 },
])("$label", async ({ body, status }) => {
	const response = await app.request("/users", { method: "POST", body: JSON.stringify(body) });

	expect(response.status).toBe(status);
});
```

### Anti-pattern: copied `it` blocks

Three `it` blocks with the same setup and the same request, differing in one value.

## Test names from the product's point of view

Someone who knows the product, but not the code, should understand each name.

| Good                                                      | Bad                                                |
| --------------------------------------------------------- | -------------------------------------------------- |
| `an unknown route answers 404 with the path it was asked` | `notFound handler returns c.json with path`        |
| `a user who signs up twice gets a conflict`               | `createUser throws when findByEmail returns a row` |
| `the health check reports how long the API has been up`   | `health returns process.uptime()`                  |
| `an expired token is refused`                             | `verifyToken returns false when exp < now`         |

Left: behaviour. Right: implementation.

## Assert on the callback, do not poll

When a result arrives asynchronously, wait for the call you expect, with `vi.waitFor`. Never
poll for a side effect with a timeout and an interval.

```ts
// good — wait for the callback, then assert on what it received
await app.request("/users", { method: "POST", body: JSON.stringify(input) });

await vi.waitFor(() => {
	expect(capture).toHaveBeenCalledTimes(1);
});
expect(capture).toHaveBeenCalledWith(expect.objectContaining({ event: "user signed up" }));
```

```ts
// bad — polling with a timeout, sleeping until something appears
for (let attempt = 0; attempt < 30; attempt++) {
	if (capture.mock.calls.length > 0) break;
	await new Promise((resolve) => setTimeout(resolve, 100));
}
```

If the mock resolves synchronously, nothing needs to wait at all: assert directly after the
action.

## Where a mock moves when a second test needs it

It follows the [placement rule](./placement-rule.md):

- One test file uses it → `__mocks__/` beside that test's `__tests__/`.
- Tests in several modules use it → `src/shared/__mocks__/`, or `src/testing/` when it is
  setup every test needs.

Example: `mock-posthog-capture.ts` starts in `users/__mocks__/`, because only the sign-up
tests check an event. When `orders/` starts sending events too, it moves to
`src/shared/__mocks__/mock-posthog-capture.ts`, and both modules import it from there.
