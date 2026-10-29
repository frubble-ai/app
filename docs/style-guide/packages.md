# Package Conventions

How code moves out of an app and into `packages/`. [Monorepo](../monorepo.md) covers how to
create a package.

## When to extract

1. **`src/shared/` is shared inside one app, and it is the default.** Code that several
   modules of the same app use lives there.

2. **`packages/` is for code two or more apps use, and only once they do.** Do not promote
   code because it *could* be reused. Promote it when a second app imports it. Repository
   tooling is the exception: `@frubble/eslint-plugin` is a package because the root ESLint
   config loads it for every workspace, not because an app imports it.

## Exports

3. **A package exports TypeScript source through a flat root entry.** Consumers import from
   the package name; a subpath exists only where a consumer needs a slice of the package
   without the rest.

   ```json
   {
   	"name": "@frubble/example",
   	"exports": {
   		".": "./src/index.ts"
   	}
   }
   ```

   ```ts
   import { formatMoney } from "@frubble/example";
   ```

4. **Test data for a shape a package owns is exported from a `testing` subpath.** Only tests
   and `__mocks__/` import it; production code never does, so faker and the factories stay
   out of the runtime.

   ```json
   {
   	"exports": {
   		".": "./src/index.ts",
   		"./testing": "./src/testing/index.ts"
   	}
   }
   ```

   ```ts
   // apps/backend/src/users/__mocks__/generate-user.ts
   import { generateUser } from "@frubble/example/testing";
   ```

5. **No build step.** Packages export `.ts` source, not compiled output. Whatever consumes the
   package runs it directly — Bun for the API, Node for tooling such as ESLint — and `tsc`
   type-checks it in place, so there is no `dist/` to rebuild or keep in sync.
