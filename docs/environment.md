# Environment

Every variable the processes read, where it comes from in stg, and what happens without it.
Locally they come from `apps/backend/.env.local` (copy `.env.example`); in stg Terraform sets
them on the Cloud Run services and the migration job, secrets through Secret Manager.

`APP_PROCESS` picks what the image runs: `api` (the default) or `worker`. The platform sets it
on the worker service and nothing else about how the image starts.

## API (`src/services/api`)

| Variable                                   | Required       | Stg source            | Notes                                                                             |
| ------------------------------------------ | -------------- | --------------------- | --------------------------------------------------------------------------------- |
| `APP_ENV`                                  | yes            | Terraform             | `local`, `dev`, `stg` or `prd`                                                    |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` | yes            | Terraform             | the private Cloud SQL instance                                                    |
| `DB_PASSWORD`                              | yes            | Secret Manager        |                                                                                   |
| `DB_CA_PEM`                                | outside local  | Terraform             | the instance's CA; every connection, drizzle-kit's too, is TLS against it         |
| `BETTER_AUTH_URL`                          | yes            | Terraform             | the API's public origin                                                           |
| `BETTER_AUTH_SECRET`                       | yes, 32+ chars | Secret Manager        |                                                                                   |
| `CORS_ORIGIN`                              | no             | Terraform             | comma-separated browser origins, no wildcards; empty means none                   |
| `PUBSUB_EMAILS_TOPIC`                      | yes            | Terraform             | locally the emulator's topic, with `PUBSUB_EMULATOR_HOST` and `PUBSUB_PROJECT_ID` |
| `APP_URL`                                  | yes            | Terraform             | the web app's origin: invitation links and the redirect after connecting a tool   |
| `COMPOSIO_API_KEY`                         | yes            | Secret Manager        | the environment's Composio project key; codegen reads it too (`.env.local`, CI secret) |
| `COMPOSIO_AUTH_CONFIG_IDS`                 | yes            | Terraform             | `github=ac_…,linear=ac_…,slack=ac_…`, every provider ([integrations](integrations.md)) |
| `TRUSTED_PROXIES`                          | no             |                       | proxies appending to `X-Forwarded-For`, at least 1; default 1, the load balancer  |
| `HOST`, `PORT`                             | no             | Cloud Run sets `PORT` | default `0.0.0.0:8080`                                                            |
| `LOG_LEVEL`, `LOG_FORMAT`                  | no             |                       | `json` when `NODE_ENV=production`, else pretty                                    |

## Worker (`src/services/worker`)

| Variable                        | Required   | Stg source            | Notes                                                                                                                                                       |
| ------------------------------- | ---------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `APP_ENV`                       | yes        | Terraform             |                                                                                                                                                             |
| `EMAIL_PROVIDER`                | yes        | Terraform             | `mailgun` or `resend`                                                                                                                                       |
| `EMAIL_API_KEY`                 | yes        | Secret Manager        | the provider's sending key                                                                                                                                  |
| `EMAIL_DOMAIN`                  | yes        | Terraform             | the sending domain registered at the provider                                                                                                               |
| `EMAIL_API_URL`                 | no         |                       | the provider's API origin, for a stand-in; https outside local                                                                                              |
| `EMAIL_FROM`, `EMAIL_FROM_NAME` | no         | Terraform             | defaults `noreply@<EMAIL_DOMAIN>`, `Frubble`                                                                                                                |
| `PUSH_TOKEN`                    | local only | `yarn local:create`   | 32+ chars; every push must carry it as `?token=`, since nothing else guards the port locally. Cloud Run's invoker check and internal ingress do that in stg |
| `EMAIL_SUPPORT_URL`             | no         |                       | the footer link                                                                                                                                             |
| `HOST`, `PORT`                  | no         | Cloud Run sets `PORT` |                                                                                                                                                             |

## Migration (`scripts/migrate.ts`)

`SHOULD_RUN_MIGRATION=true` exactly, plus `APP_ENV` and the `DB_*` variables. Any other
value is a logged no-op, so the script run anywhere but the migration job changes nothing.

## App

Locally from `apps/app/.env.local` (copy `.env.local.example`); in stg Terraform sets them on the
app's Cloud Run service. The server reads them at request time, so one image serves every
environment.

| Variable      | Required      | Stg source        | Notes                                                                                                                    |
| ------------- | ------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `APP_ENV`     | no            | Terraform         | `local` (the default), `dev`, `stg` or `prd`                                                                             |
| `GRAPHQL_URL` | outside local | Terraform         | the API's GraphQL URL; locally `http://localhost:8080/graphql` unless set. Its `CORS_ORIGIN` must allow the app's origin |
| `PORT`        | no            | Cloud Run sets it | default 3000                                                                                                             |

## Build arguments

`APP_VERSION`, `APP_COMMIT` and `APP_ENV` are baked into the image by the deploy; `GET /`
answers them and the deploy checks `commit`.
