# app

Yarn 4 + Turborepo monorepo. One app: the API and the email worker, Bun + Hono + GraphQL
Yoga with Better Auth, deployed to Cloud Run behind a Google load balancer, with Postgres and
Pub/Sub. Infra lives in [`platform`](https://github.com/frubble-ai/platform).

```
apps/backend/     @frubble/backend — the API, the worker, the migrate and seed scripts
packages/         db, events, emails, gql, seed, eslint-plugin
docs/             workspace conventions, sign-in, environment, deployment
```

## Getting started

Node 22.18+ for tooling, Bun 1.4.4 for the API.

```bash
corepack enable
yarn install
cp .env.local.example .env.local
cp apps/backend/.env.example apps/backend/.env.local
yarn local:create   # Postgres and the Pub/Sub emulator, with the topic and its push subscription
yarn db:migrate
yarn db:seed        # user.1@example.com, user.2@example.com; password123
yarn dev            # API at http://localhost:8080/graphql, worker on 8081, app at http://localhost:3000
```

The worker sends real email, so `apps/backend/.env.local` needs the provider's key and
sending domain ([sign-in](docs/auth.md)). Tests run against a Postgres container, so Docker must be
running.

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

| Workflow               | Trigger             | Does                                                                                                  |
| ---------------------- | ------------------- | ----------------------------------------------------------------------------------------------------- |
| `backend-code-quality` | PR → `dev` / `stg`  | scan, lint, typecheck, tests, docker build                                                            |
| `backend-cd`           | push → `stg`        | build, trivy scan, push image, roll out to Cloud Run ([deployment](docs/deployment.md))               |
| `pr-template`          | every PR, and edits | conventional title on every PR; every template section filled and checklist answered, except for bots |

`Backend - Code Quality Summary` and `Quality — PR Template` are the required checks. Deploys run in the `backend-stg`
environment, which accepts deployments from `stg` only and whose name is part of the
identity `platform` trusts. They use OIDC, no keys. Which variables the deploy
reads, and where each lives, is the table in [`docs/deployment.md`](docs/deployment.md#github-configuration).
