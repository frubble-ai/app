# syntax=docker/dockerfile:1

# Built from the repository root (`docker build -f apps/backend/Dockerfile .`):
# the lockfile, .yarnrc.yml and the workspace manifest all live there. One
# image runs every process, each with its own command:
#   api (default CMD):  bun run src/services/api/index.ts
#   worker:             bun run src/services/worker/index.ts
#   migration:          bun run scripts/migrate.ts   (SHOULD_RUN_MIGRATION=true)
#   admin invite:       bun run scripts/create-admin.ts <email>
#
# Both base images are pinned by digest, not only by tag: a tag can be moved to
# another image, a digest names exactly one. The tag stays beside it so a
# reader can tell what the digest is.

# ---- deps: production dependencies of the backend and the packages it imports ----
# Node only to run Yarn. Every workspace manifest is copied so Yarn resolves
# the whole graph; `workspaces focus --production` installs what the backend
# needs at runtime and nothing else.
FROM node:22-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914 AS deps
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/backend/package.json apps/backend/
COPY packages/db/package.json packages/db/
COPY packages/emails/package.json packages/emails/
COPY packages/eslint-plugin/package.json packages/eslint-plugin/
COPY packages/events/package.json packages/events/
COPY packages/gql/package.json packages/gql/
COPY packages/seed/package.json packages/seed/
RUN yarn workspaces focus @frubble/backend --production

# ---- builder: the full install, for the code generators ----
# The GraphQL types and the resolver signatures are generated, never
# committed. Only their output leaves this stage.
FROM node:22-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914 AS builder
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/backend/package.json apps/backend/
COPY packages/db/package.json packages/db/
COPY packages/emails/package.json packages/emails/
COPY packages/eslint-plugin/package.json packages/eslint-plugin/
COPY packages/events/package.json packages/events/
COPY packages/gql/package.json packages/gql/
COPY packages/seed/package.json packages/seed/
# skip-build: no lifecycle scripts, so the root's husky postinstall (a git
# hook installer) never runs in an image that has no git.
RUN yarn install --immutable --mode=skip-build
COPY packages/gql packages/gql/
COPY apps/backend/codegen.yml apps/backend/
RUN yarn workspace @frubble/gql codegen && yarn workspace @frubble/backend codegen

# ---- runtime ----
FROM oven/bun:1.4.4-alpine@sha256:4cf82f5686b196504fe119db3fcd9185b191f82ece82c40680e597228ec6070a AS runtime
WORKDIR /app

ARG APP_VERSION=dev
ARG APP_COMMIT=local
ARG APP_ENV=production
ENV APP_VERSION=$APP_VERSION \
    APP_COMMIT=$APP_COMMIT \
    APP_ENV=$APP_ENV \
    NODE_ENV=production \
    PORT=8080

# The workspaces keep their place in the tree, so Bun finds the hoisted
# node_modules by walking up from apps/backend, as it does locally.
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY packages/db packages/db/
COPY packages/emails packages/emails/
COPY packages/events packages/events/
COPY packages/gql packages/gql/
COPY --from=builder /app/packages/gql/src/__generated__ packages/gql/src/__generated__/
COPY apps/backend/package.json apps/backend/tsconfig.json apps/backend/
COPY apps/backend/src apps/backend/src
COPY apps/backend/scripts apps/backend/scripts
COPY --from=builder /app/apps/backend/src/__generated__ apps/backend/src/__generated__/

WORKDIR /app/apps/backend

# Drop privileges: the `bun` user ships with the base image.
USER bun

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "run", "src/services/api/index.ts"]
