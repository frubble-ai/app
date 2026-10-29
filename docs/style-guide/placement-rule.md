# Universal Placement Rule

Where a unit of code lives: a module, a helper, a type, a mock, a factory, a third-party
wrapper. The same rule applies to every one of them, in every app and package.

## Rules

1. **Used by only one consumer → colocate it.** It lives as a sibling file of its consumer, or
   inside the consumer's folder. Never more than one level up.

2. **Used by more than one unrelated consumer → it lives in `src/shared/`.**

3. **A helper used only by its parent nests inside the parent, recursively.** A helper of
   `users/` lives in `users/lib/`, not in `src/shared/`; a helper used only by that helper
   nests inside it again.

4. **A folder with an `index.ts` is a module.** It holds only:

   | Entry         | What it is                                                      |
   | ------------- | --------------------------------------------------------------- |
   | `index.ts`    | the module's surface: what other code may import                |
   | `lib/`        | the module's helpers. Never a helper file beside the `index.ts` |
   | child modules | as folders, each with its own `index.ts`                        |
   | `__tests__/`  | the module's tests                                              |
   | `__mocks__/`  | the module's mocks and data factories                           |

   ```
   # good                        # bad
   users/                        users/
   ├── index.ts                  ├── index.ts
   ├── lib/                      ├── to-row.ts        ← helper beside the index
   │   └── to-row.ts             └── __tests__/
   ├── create-user/
   │   └── index.ts
   └── __tests__/
   ```

5. **A file with nothing to share a folder with is a module of its own**:
   `config/index.ts`, not `config.ts`. It gets a folder the moment it is created, so adding
   a helper or a test later moves nothing.

6. **Collections are the exception.** A folder whose files are all members of one kind holds
   them directly, with no folder per file. Ours:

   | Folder     | Holds                                            |
   | ---------- | ------------------------------------------------ |
   | `lib/`     | a module's helpers                               |
   | `cases/`   | one file per case, such as a use case per action |
   | `rules/`   | one file per rule, as in `@frubble/eslint-plugin` |
   | `testing/` | shared test setup                                |
   | `shared/`  | units with more than one consumer                |

## How to decide

- One consumer → colocate.
- More than one consumer → `src/shared/`.
- A helper with one consumer → stays inside its parent.

## What enforces it

`@frubble/eslint-plugin`, through `yarn lint`. `apps/*/src/**` gets all three rules;
`packages/*/src/**` gets `folder-structure` and `kebab-case-folders`.

| Rule                 | Reports                                                                                                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `placement`          | an `@/` import that reaches into another module's `components/`, `hooks/` or `__mocks__/` from outside that module. `shared/`, `testing/` and `config/` are open to everyone |
| `folder-structure`   | a bare file directly in `shared/components/`, `shared/hooks/` or a module's `components/` or `hooks/`, and a component or hook folder whose main file is not `index.ts`      |
| `kebab-case-folders` | a folder under `src/` whose name is not kebab-case, with the suggested name. `__tests__`-style folders, `_private` folders, `(groups)` and `[segments]` are allowed          |

The rules check what a linter can see. Whether a unit has one consumer or several is still a
call the author and the reviewer make.
