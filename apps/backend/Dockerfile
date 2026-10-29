# syntax=docker/dockerfile:1

# Built from the repository root (`docker build -f apps/backend/Dockerfile .`):
# the lockfile, .yarnrc.yml and the workspace manifest all live there.
#
# Both base images are pinned by digest, not only by tag: a tag can be moved to
# another image, a digest names exactly one. The tag stays beside it so a
# reader can tell what the digest is.

# ---- deps: production dependencies of this one workspace ----
# Node only to run Yarn. `workspaces focus --production` installs what
# @frubble/backend needs at runtime and nothing for the other workspaces.
FROM node:22-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914 AS deps
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
COPY apps/backend/package.json apps/backend/
RUN yarn workspaces focus @frubble/backend --production

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

# The workspace keeps its place in the tree, so Bun finds the hoisted
# node_modules by walking up from apps/backend, as it does locally.
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.json ./
COPY apps/backend/package.json apps/backend/tsconfig.json apps/backend/
COPY apps/backend/src apps/backend/src

WORKDIR /app/apps/backend

# Drop privileges: the `bun` user ships with the base image.
USER bun

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "run", "src/index.ts"]
