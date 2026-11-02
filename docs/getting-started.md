# Getting started

Yarn 4 + Turborepo. The infrastructure lives in the `platform` repository.

Node 22.18+ for tooling, Bun 1.4.4 for the API, and Docker, curl and openssl for the local
services.

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
sending domain ([sign-in](auth.md)). Tests run against a Postgres container, so Docker must be
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
```

The image carries no configuration: running it needs the variables in
[environment](environment.md), pointing at a Postgres and Pub/Sub the container can reach.
