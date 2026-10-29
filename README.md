# app

Yarn 4 + Turborepo monorepo. One app so far: the API, Bun + Hono, deployed to a GCE
instance behind a Cloudflare Tunnel. Infra lives in
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
| `deploy-stg`           | push → `stg`        | build, trivy scan, push image, roll out over IAP  |

`Backend - Code Quality Summary` is the required check. Deploys use OIDC, no keys; the
`GCP_*` and `*_ENABLED` repository variables come from `platform`.
