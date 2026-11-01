# Monorepo

One repository, several workspaces. Yarn 4 installs every workspace into one `node_modules`
from one `yarn.lock`; Turborepo runs their scripts and caches the results.

## Layout

```
.
├── apps/
│   └── backend/          @frubble/backend — the API, the worker, the scripts (one image)
├── packages/
│   ├── db/               @frubble/db — the Drizzle schema, client and migrations
│   ├── events/           @frubble/events — the message catalog, envelope and transports
│   ├── emails/           @frubble/emails — the email templates
│   ├── gql/              @frubble/gql — the GraphQL schema and its generated types
│   ├── seed/             @frubble/seed — the local users
│   └── eslint-plugin/    @frubble/eslint-plugin — the placement rules
├── bin/                  local-*.sh: the docker-compose dependencies
├── docker-compose.yml    Postgres and the Pub/Sub emulator
├── docs/
├── package.json          the workspace: lists apps/* and packages/*, pins Yarn
├── turbo.json            the tasks turbo runs in every workspace
├── tsconfig.json         the base every workspace's tsconfig extends
├── biome.json            lint and format rules for the whole repository
└── .yarnrc.yml           Yarn settings
```

Root files hold what every workspace shares. A workspace holds only what is its own.

## Apps and packages

|                    | `apps/`                                          | `packages/`                          |
| ------------------ | ------------------------------------------------ | ------------------------------------ |
| What               | something that runs: a server, a job, a frontend | code other workspaces import         |
| Deployed           | yes, each on its own                             | never on its own, only inside an app |
| Imported by others | no                                               | yes                                  |
| Name               | `@frubble/<name>`                                 | `@frubble/<name>`                     |

An app depends on packages; a package never depends on an app. If two apps need the same
code, that code becomes a package rather than one app importing from the other. A package
that owns a toolchain of its own (drizzle-kit for `db`, graphql-codegen for `gql`,
react-email for `emails`) is a package even with one consumer: the tool runs against the
package, not against the app.

The backend is one app with two processes and three scripts, all in one image: the API
(`src/services/api`), the worker (`src/services/worker`) and `scripts/{migrate,seed,create-admin}.ts`.

## Source-first exports

A package exports its TypeScript source, not a build of it:

```json
{
	"name": "@frubble/example",
	"type": "module",
	"exports": {
		".": "./src/index.ts"
	}
}
```

Bun runs TypeScript directly and `tsc` type-checks it in place, so an app importing
`@frubble/example` reads `src/index.ts` with no build step in between. There is nothing to
rebuild before a change is visible, no `dist/` to keep in sync, and no stale build to
debug. The cost is that every consumer must understand TypeScript, which every workspace
here does.

## Tasks

`turbo.json` defines `codegen`, `dev:api`, `dev:worker`, `typecheck`, `lint`, `format`,
`format:write`, `test` and `test:coverage`. `codegen` writes the GraphQL types
(`packages/gql/src/__generated__`, `apps/backend/src/__generated__`), which are never
committed: `typecheck`, `lint` and `test` depend on it, and the image build runs it. From the root, `yarn <task>` runs it in every workspace that has a script of
that name; a workspace without the script is skipped.

Turbo caches a task by hashing its inputs. `globalDependencies` lists the root files whose
change invalidates every workspace's cache: `tsconfig.json`, `biome.json`,
`eslint.config.mjs`, `vitest.shared.ts` and `.nvmrc`. `test:coverage` caches its
`coverage/` folder too, so a replayed run still leaves the report for the root merge.
`dev` and `format:write` are never cached: one is a server that keeps running, the other
changes files.

To run one workspace only:

```bash
yarn turbo run test --filter=@frubble/backend
```

## Adding a package

1. Create `packages/<name>/` with:

   `package.json`

   ```json
   {
     "name": "@frubble/<name>",
     "private": true,
     "type": "module",
     "exports": { ".": "./src/index.ts" },
     "scripts": {
       "test": "vitest run",
       "test:coverage": "vitest run --coverage",
       "typecheck": "tsc --noEmit",
       "lint": "eslint .",
       "format": "biome check --error-on-warnings .",
       "format:write": "biome check --write ."
     }
   }
   ```

   `tsconfig.json`

   ```json
   {
     "extends": "../../tsconfig.json",
     "include": ["src/**/*.ts"]
   }
   ```

   and `src/index.ts`, plus a `vitest.config.ts` that uses `coverage` from
   `vitest.shared.ts`.
2. Add the tools those scripts call to the package's own `devDependencies`: `vitest`,
   `@vitest/coverage-istanbul`, `vite`, `typescript`, `eslint` and `@biomejs/biome`. A
   workspace runs only its own dependencies' binaries, not the root's.
3. Run `yarn install` from the root. Yarn links the new workspace; `yarn.lock` changes, and
   that change is committed.

## Adding an app

The same as a package, under `apps/<name>/`, plus:

1. A `dev` script, and `start` if it runs as a server.
2. To use a package, add it to the app's `dependencies` as `"@frubble/<name>": "workspace:*"`
   and run `yarn install`.
3. If it ships as an image, a `Dockerfile` in the app that builds from the repository root
   with `yarn workspaces focus @frubble/<name> --production`, like `apps/backend/Dockerfile`.
4. Its own quality and deploy workflows. `backend-code-quality.yml` is the model: a
   `discover` job decides what the pull request touches, and a final summary job is the
   check branch protection requires.
