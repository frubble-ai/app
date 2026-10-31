# app

Yarn 4 + Turborepo monorepo. One app so far: the API, Bun + Hono, deployed to Cloud Run
behind a Google load balancer. Infra lives in
[`platform`](https://github.com/frubble-ai/platform).

```
apps/backend/     @frubble/backend — the API
packages/         shared code
docs/             workspace conventions
```

## Getting started

Node 22.18+ for tooling, Bun 1.4.4 for the API.

```bash
corepack enable
yarn install
yarn dev            # http://localhost:8080
```

```bash
yarn typecheck
yarn lint
yarn format         # yarn format:write to apply
yarn test
```

Husky runs `format`, `lint`, `typecheck` and `test` before every commit, and commitlint on
the message ([Conventional Commits](https://www.conventionalcommits.org)).

## Container

```bash
docker build -f apps/backend/Dockerfile -t frubble-backend .
docker run --rm -p 8080:8080 frubble-backend
```

## CI/CD

| Workflow               | Trigger             | Does                                              |
| ---------------------- | ------------------- | ------------------------------------------------- |
| `backend-code-quality` | PR → `dev` / `stg`  | scan, lint, typecheck, tests, docker build        |
| `backend-cd`           | push → `stg`        | build, trivy scan, push image, roll out to Cloud Run ([deployment](docs/deployment.md)) |
| `pr-template`          | every PR, and edits | conventional title on every PR; every template section filled and checklist answered, except for bots |

`Backend - Code Quality Summary` and `Quality — PR Template` are the required checks. Deploys run in the `backend-stg`
environment, which accepts deployments from `stg` only and whose name is part of the
identity `platform` trusts. They use OIDC, no keys. Which variables the deploy
reads, and where each lives, is the table in [`docs/deployment.md`](docs/deployment.md#github-configuration).
