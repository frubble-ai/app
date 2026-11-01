# Environment

Every variable the processes read, where it comes from in stg, and what happens without it.
Locally they come from `apps/backend/.env.local` (copy `.env.example`); in stg Terraform sets
them on the Cloud Run services and the migration job, secrets through Secret Manager.

`APP_PROCESS` picks what the image runs: `api` (the default) or `worker`. The platform sets it
on the worker service and nothing else about how the image starts.

## API (`src/services/api`)

| Variable | Required | Stg source | Notes |
| --- | --- | --- | --- |
| `APP_ENV` | yes | Terraform | `local`, `stg` or `prd` |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` | yes | Terraform | the private Cloud SQL instance |
| `DB_PASSWORD` | yes | Secret Manager | |
| `DB_CA_PEM` | outside local | Terraform | the instance's CA; the connection is TLS against it |
| `BETTER_AUTH_URL` | yes | Terraform | the API's public origin |
| `BETTER_AUTH_SECRET` | yes, 32+ chars | Secret Manager | |
| `CORS_ORIGIN` | no | Terraform | comma-separated browser origins, no wildcards; empty means none |
| `PUBSUB_EMAILS_TOPIC` | yes | Terraform | locally the emulator's topic, with `PUBSUB_EMULATOR_HOST` and `PUBSUB_PROJECT_ID` |
| `TRUSTED_PROXIES` | no | | proxies appending to `X-Forwarded-For`, at least 1; default 1, the load balancer |
| `HOST`, `PORT` | no | Cloud Run sets `PORT` | default `0.0.0.0:8080` |
| `LOG_LEVEL`, `LOG_FORMAT` | no | | `json` when `NODE_ENV=production`, else pretty |

## Worker (`src/services/worker`)

| Variable | Required | Stg source | Notes |
| --- | --- | --- | --- |
| `APP_ENV` | yes | Terraform | |
| `EMAIL_PROVIDER` | yes | Terraform | `mailgun` or `resend` |
| `EMAIL_API_KEY` | yes | Secret Manager | the provider's sending key |
| `EMAIL_DOMAIN` | yes | Terraform | the sending domain registered at the provider |
| `EMAIL_API_URL` | no | | the provider's API origin, for a stand-in |
| `EMAIL_FROM`, `EMAIL_FROM_NAME` | no | Terraform | defaults `noreply@frubble.ai`, `Frubble` |
| `EMAIL_SUPPORT_URL` | no | | the footer link |
| `HOST`, `PORT` | no | Cloud Run sets `PORT` | |

## Migration (`scripts/migrate.ts`)

`SHOULD_RUN_MIGRATION=true` exactly, plus `APP_ENV` and the `DB_*` variables. Any other
value is a logged no-op, so the script run anywhere but the migration job changes nothing.

## Build arguments

`APP_VERSION`, `APP_COMMIT` and `APP_ENV` are baked into the image by the deploy; `GET /`
answers them and the deploy checks `commit`.
