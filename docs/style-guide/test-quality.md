# Writing Tests That Actually Work

## Core principle

**Write the test as someone who knows what the feature does, not how it is built.**

A test should read like a requirement. If understanding it requires knowing the internals —
the state shape, which helper runs, the order of internal calls — the test is coupled to the
implementation and will not reliably catch regressions.

If you refactor the internals and the test breaks, the test is bad. If you introduce a real
bug and the test passes, the test is bad.

## What to test

- What a caller sees: "`GET /health` answers `200` with `status: ok`".
- Each outcome of a condition: "an unknown route answers `404` with the path it was asked".
- Validation: "a request with no email is refused with a message that names the field".
- Error states, not only the happy path: a dependency that fails, a timeout, a bad input.
- Edge cases in pure logic: date arithmetic, money, pagination boundaries.

## What not to test

- Internal state values.
- Implementation details: which helper was called, the order of internal calls.
- That a library works. Test that *our code* behaves correctly, not that Hono routes or Luxon
  adds days.
- Snapshots as the main strategy. They break on every refactor, and people approve the new
  snapshot without reading it.

## Rules

1. **Every assertion maps to a requirement.** If you cannot phrase it as something the
   product or the caller cares about, reconsider what you are testing.

2. **Mocks live in files.** Every mock is a separate file in `__mocks__/`. An integration test
   mocks only network and process boundaries; a unit test may also replace the collaborators
   of the unit under test, such as a use case or the clock. Over-mocking means testing that
   the mocks work, not the code.

3. **A test that does not fail on a real bug is deleted.** It gives false confidence.

## Arrange-Act-Assert

Every test has three parts, in this order and visibly separate: set up the conditions,
perform one action, check the outcome.

```ts
it("answers 404 with the path it was asked", async () => {
	const path = `/${faker.lorem.slug()}`; // arrange

	const response = await app.request(path); // act

	expect(response.status).toBe(404); // assert
	expect(await response.json()).toMatchObject({ path });
});
```

## Unit and integration tests

Both are required. They catch different bugs, and neither replaces the other.

**Unit tests** cover pure functions, validators, mappers, formatting and state machines.
They are isolated, fast and precise: a unit test that `formatMoney(1999)` returns
`"R$ 19,99"` names the exact bug when it fails, where an integration test would only say a
response was wrong.

**Integration tests** exercise a whole feature with its real dependencies — the app, the
router, the database — and mock only the network boundary. They catch the bugs at the seams
between modules, which no unit test reaches.

## Anti-patterns

| Anti-pattern           | Why it fails                                                                       | Fix                                                                |
| ---------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Snapshot abuse         | Breaks on every refactor, gets approved unread, and real bugs get lost in the diff | Assert explicitly on the behaviour that matters                    |
| Testing internal state | A refactor breaks the test while the behaviour is unchanged                        | Assert on what the caller sees                                     |
| Over-mocking           | The test checks that the mocks work, not the code                                  | In integration tests, mock only network and process boundaries     |
| Dead mocks             | Noise, false confidence, drift copied from other tests                             | Mock only what the code under test actually calls; delete the rest |
| Inside knowledge       | The test is coupled to the implementation and passes when the behaviour breaks     | Write every test knowing only the requirement, not the code        |

## Checklist for every test

1. Could someone who knows the product, but not the code, read this test and say what it
   checks? They should.
2. Could I rename internal functions and variables and still have it pass? It should.
3. Could I restructure the code and still have it pass, if the behaviour is the same? It
   should.
4. If I introduce a real bug — a wrong value returned, a missing check — does it fail? It
   must.
