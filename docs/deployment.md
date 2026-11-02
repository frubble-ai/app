# Deployment

Two pipelines ship this repository. [`backend-cd.yml`](../.github/workflows/backend-cd.yml)
builds one image and moves the migration job, the API and the worker onto it, in that order;
[`app-cd.yml`](../.github/workflows/app-cd.yml) builds the web app's image and moves its service
onto it ([App](#app)).
The GCP side (the service and job definitions, the load balancer, the database, the queue,
the registry, the deploy identity) lives in [`platform`](https://github.com/frubble-ai/platform).

## Branches and environments

| Trigger                                        | Environment   | Deploys                                                    |
| ---------------------------------------------- | ------------- | ---------------------------------------------------------- |
| Push to `stg`                                  | `backend-stg` | the API to stg                                             |
| Manual run (Actions → Run workflow) from `stg` | `backend-stg` | the API to stg, even if nothing in the path filter changed |
| Push to `dev`                                  | nothing       |                                                            |

A push deploys only when it touches `apps/backend`, `packages`, the root manifests, the
Dockerfile's inputs or the pipeline itself. One rollout runs at a time; a newer one waits.

## What a deploy does

1. **Build and scan**, with no cloud credentials. Builds `apps/backend/Dockerfile` once,
   tagged by commit, with the version, commit and environment baked in. Trivy fails the run
   on any CRITICAL vulnerability.
2. **Deploy**, in the `backend-stg` environment, as the deploy identity `platform` trusts:
   1. Pushes the image to Artifact Registry as `frubble-backend:<commit>`
      ([`push-image.sh`](../.github/scripts/deploy/push-image.sh)). A tag is pushed once and
      never pushed over: a re-run of the same commit reuses the image it already pushed, after
      scanning that image again with the current Trivy rules.
   2. Runs the migration ([`migrate.sh`](../.github/scripts/deploy/migrate.sh)): the migration
      job's image is moved to this one and the job is executed once, with `--wait`. A failed
      migration stops the deploy here, with both services still on the previous image.
   3. Rolls the API onto it with `gcloud run services update --image`
      ([`rollout.sh`](../.github/scripts/deploy/rollout.sh)). That creates a revision that
      differs from the current one by the image only. Everything else about the service,
      CPU, memory, scaling, probes, env, the identity it runs as, is Terraform's in `platform`;
      a deploy never changes it. Traffic is then set to the latest revision, which also undoes
      a rollback's pin.
   4. Waits until the new revision is healthy and holds all the traffic, checks that it runs
      the image just pushed, then asks `https://<API_HOSTNAME>/` which commit it serves and
      fails unless it is this one.
   5. Rolls the worker the same way. It has no public name, so its check is that the revision
      on the new image is ready and holds the traffic.

Cloud Run moves traffic only to a revision whose startup probe passed. A build that does not
start leaves the previous revision serving, and the run fails at step 2.3. A revision that
starts but fails step 2.4 is taken out again: the script puts the traffic back on the revision
that held it before the deploy, and the run fails. A migration that ran before a failed
rollout stays applied: migrations are additive, and the previous image must keep working on
the new schema.

## Rollback

Point the service back at the previous revision. Revisions are kept, so this is immediate:

```bash
gcloud run revisions list --service frubble-stg-api --region us-central1 --project frubble-stg
gcloud run services update-traffic frubble-stg-api --region us-central1 --project frubble-stg \
  --to-revisions <previous-revision>=100
```

The pin stays until the next deploy from `stg`, which moves traffic to the latest revision
again. The worker rolls back the same way, with `frubble-stg-worker`. A migration is not
rolled back: write a new one.

## Resetting the database

[`db-reset.yml`](../.github/workflows/db-reset.yml) drops every table and enum the migrations
made in stg's database and runs the migrations again from nothing, as one execution of the
migration job with `--reset` ([`reset-db.sh`](../.github/scripts/deploy/reset-db.sh)), on the image
the job already has. It then rolls the worker, then the API, onto that image with the deploy's
rollout script, the worker first so it reads what the new API publishes before the API publishes
it. It is for when the migrations' history is rewritten, as when they are squashed into one: a
deploy's migration then fails, since the tables it would create exist, until the database is
reset. Every account and session goes with it.

The job must already run an image whose migration script knows `--reset`, since the reset runs on
the job's current image: an older one ignores the argument and only migrates. So the order is the
deploy first (its migration step moves the job onto the new image, then fails, and the services
stay on the previous image), then the reset, which migrates and rolls the services forward.

Between the migration and the API's rollout, the previous revision serves on the new schema. A
schema the previous image cannot write to, such as a changed enum, fails those requests for the
minute or two the rollout takes. Rolling the services back to an image from before the reset
leaves them on a schema they do not match. The way back is a deploy of the older commit, whose
migration step moves the job onto the older image, then another reset, which runs on that image.
An image that predates `--reset` only migrates, so the way back stops at the first commit that has
it.

It runs by hand only (Actions → DB - Reset → Run workflow, from `stg`) and only for `drn1996`: the
job refuses anyone else and any other branch. It shares the deploy's concurrency group, so it never
runs beside a deploy, and it signs in as the deploy identity, whose trust rule in `platform` names
the workflow file. The migration script takes `--reset` only with `APP_ENV` `local` or `stg`, and refuses it otherwise,
whatever calls it. Locally the
same is `yarn db:reset`.

## Workflows

| Workflow               | Trigger             | Does                                                                                                  |
| ---------------------- | ------------------- | ----------------------------------------------------------------------------------------------------- |
| `backend-code-quality` | PR → `dev` / `stg`  | scan, lint, typecheck, tests, docker build                                                            |
| `backend-cd`           | push → `stg`        | build, trivy scan, push image, migrate, roll out to Cloud Run                                         |
| `app-code-quality`     | PR → `dev` / `stg`  | the same checks for `apps/app`                                                                        |
| `app-cd`               | push → `stg`        | build, trivy scan, push image, roll out the web app                                                   |
| `db-reset`             | by hand, from `stg` | drop and migrate stg's database (Resetting the database, above)                                       |
| `pr-template`          | every PR, and edits | conventional title on every PR; every template section filled and checklist answered, except for bots |

`Backend - Code Quality Summary` and `Quality — PR Template` are the required checks. Backend deploys run in the `backend-stg`
environment and app deploys in `app-stg`, which accept deployments from `stg` only and whose names are part of the
identity `platform` trusts. They use OIDC, no keys. Which variables the deploy
reads, and where each lives, is the table in GitHub configuration, below.

## GitHub configuration

Deploy values live on the environment. Values a job-level `if:` reads cannot come from an
environment and stay on the repository. A prd deploy would reuse the deploy job with a
`backend-prd` environment holding the same names, and still change the workflow in three
places: the branch the build gates on, the `APP_ENV` and `APP_VERSION` it bakes in, and the
environment name on the job, which the trust rule in `platform` names too.

| Name                                   | Where                  | Value                                                                 |
| -------------------------------------- | ---------------------- | --------------------------------------------------------------------- |
| `BACKEND_CD_ENABLED`                   | repository variable    | `true` turns the pipeline on                                          |
| `GCP_WIF_PROVIDER`, `GCP_WIF_AUDIENCE` | repository variable    | the identity pool provider and audience, from `platform`              |
| `GCP_DEPLOY_HUB`, `GCP_DEPLOY_SPOKE`   | `backend-stg` variable | the hub the job signs in as and the spoke it becomes, from `platform` |
| `GCP_PROJECT_ID`, `GCP_REGION`         | `backend-stg` variable | `frubble-stg`, `us-central1`                                          |
| `GCP_REGISTRY`                         | `backend-stg` variable | `us-central1-docker.pkg.dev/frubble-stg/frubble-stg`                  |
| `GCP_RUN_SERVICE`                      | `backend-stg` variable | `frubble-stg-api`                                                     |
| `GCP_RUN_SERVICE_WORKER`               | `backend-stg` variable | `frubble-stg-worker`; unset skips the worker rollout                  |
| `GCP_RUN_JOB_MIGRATE`                  | `backend-stg` variable | `frubble-stg-migrate`; unset skips the migration                      |
| `API_HOSTNAME`                         | `backend-stg` variable | `api.stg.frubble.ai`                                                  |

The `backend-stg` environment accepts deployments from `stg` only. Its name, the workflow
file name and the branch are the identity `platform` trusts; renaming any of them stops the
Google sign-in. No secrets are needed: authentication is OIDC.

## App

`.github/workflows/app-cd.yml` deploys `apps/app` the same way, on a push to `stg` that touches
the app, the packages it imports or the root config: build and scan `apps/app/Dockerfile` with no
cloud credentials, then, in the `app-stg` environment, push `frubble-app:<commit>` and roll the
app's Cloud Run service onto it with [`rollout.sh`](../.github/scripts/deploy/rollout.sh). The app
answers no commit, so its check is the worker's: the revision on the new image is ready and holds
the traffic. One image serves every environment; nothing is baked in but the code
([app](app/index.md)). Rollback is the service's previous revision, as above, with the app's
service name.

| Name                                           | Where               | Value                                                    |
| ---------------------------------------------- | ------------------- | -------------------------------------------------------- |
| `APP_CD_ENABLED`                               | repository variable | `true` turns the pipeline on                             |
| `APP_CODE_QUALITY_ENABLED`                     | repository variable | `true` turns the app's pull-request checks on            |
| `GCP_DEPLOY_HUB`, `GCP_DEPLOY_SPOKE`           | `app-stg` variable  | the same hub and spoke as `backend-stg`, from `platform` |
| `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_REGISTRY` | `app-stg` variable  | as `backend-stg`                                         |
| `GCP_RUN_SERVICE`                              | `app-stg` variable  | `frubble-stg-app`                                        |

The `app-stg` environment accepts deployments from `stg` only; its name, the workflow file name
and the branch are an entry in the deploy hub's trust rule in `platform`.
