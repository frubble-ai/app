# syntax=docker/dockerfile:1

# Production image for @frubble/app: Next's standalone server (`node server.js`), nothing in front
# of it. The platform's health check is `GET /` → 200.
#
# Built from the repository root (`docker build -f apps/app/Dockerfile .`): the build compiles the
# workspace packages it imports (@frubble/react-sdk, @frubble/gql) from source. The install reads
# @frubble-ai packages from GitHub Packages, with the token from a ~/.yarnrc.yml passed as a build
# secret: `docker build -f apps/app/Dockerfile --secret id=yarnrc,src=$HOME/.yarnrc.yml .`
#
# One image serves every environment: the server reads APP_ENV and GRAPHQL_URL from the container
# at request time (docs/environment.md).
#
# Both base images are pinned by digest, not only by tag: a tag can be moved to another image, a
# digest names exactly one. The tag stays beside it so a reader can tell what the digest is.

# ---- builder: every dependency, codegen, then Next's build ----
# Every workspace manifest is copied so Yarn installs the whole graph against the lockfile. Only
# Next's standalone output moves on: it carries the few node_modules the server needs, traced by
# the build.
FROM node:22-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914 AS builder
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/app/package.json apps/app/
COPY apps/backend/package.json apps/backend/
COPY packages/db/package.json packages/db/
COPY packages/emails/package.json packages/emails/
COPY packages/eslint-plugin/package.json packages/eslint-plugin/
COPY packages/events/package.json packages/events/
COPY packages/gql/package.json packages/gql/
COPY packages/react-sdk/package.json packages/react-sdk/
COPY packages/seed/package.json packages/seed/
# No install scripts: the root's would install git hooks, which an image has no use for. The
# @frubble-ai packages need a GitHub Packages token, mounted as ~/.yarnrc.yml for this step only,
# so it never lands in a layer.
RUN --mount=type=secret,id=yarnrc,target=/root/.yarnrc.yml,required=true \
    yarn install --immutable --mode=skip-build

# Only the source the build reads. vitest.shared.ts: next build type-checks what tsconfig.json
# includes, vitest.config.ts among it
COPY tsconfig.json vitest.shared.ts ./
COPY packages/gql packages/gql/
COPY packages/react-sdk packages/react-sdk/
COPY apps/app apps/app/
# Generate the typed documents and hooks (never committed), then build, and leave no env file
RUN yarn workspace @frubble/gql codegen \
 && yarn workspace @frubble/react-sdk codegen \
 && yarn workspace @frubble/app build \
 && find apps/app/.next -name '.env*' -delete

# ---- runtime: Next's standalone server, as the image's non-root `node` user ----
FROM node:22-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914 AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# The server and the modules it traced, then the built assets it serves as files
COPY --from=builder --chown=node:node /app/apps/app/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/app/.next/static ./apps/app/.next/static

USER node
EXPOSE 3000
CMD ["node", "apps/app/server.js"]
