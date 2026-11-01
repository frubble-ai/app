# Deployment

One pipeline ships this repository: [`backend-cd.yml`](../.github/workflows/backend-cd.yml)
builds one image and moves the migration job, the API and the worker onto it, in that order.
The GCP side (the service and job definitions, the load balancer, the database, the queue,
the registry, the deploy identity) lives in [`platform`](https://github.com/frubble-ai/platform).

## Branches and environments

| Trigger | Environment | Deploys |
|---|---|---|
| Push to `stg` | `backend-stg` | the API to stg |
| Manual run (Actions → Run workflow) from `stg` | `backend-stg` | the API to stg, even if nothing in the path filter changed |
| Push to `dev` | nothing | |

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

## GitHub configuration

Deploy values live on the environment. Values a job-level `if:` reads cannot come from an
environment and stay on the repository. A prd deploy would reuse the deploy job with a
`backend-prd` environment holding the same names, and still change the workflow in three
places: the branch the build gates on, the `APP_ENV` and `APP_VERSION` it bakes in, and the
environment name on the job, which the trust rule in `platform` names too.

| Name | Where | Value |
|---|---|---|
| `BACKEND_CD_ENABLED` | repository variable | `true` turns the pipeline on |
| `GCP_WIF_PROVIDER`, `GCP_WIF_AUDIENCE` | repository variable | the identity pool provider and audience, from `platform` |
| `GCP_DEPLOY_HUB`, `GCP_DEPLOY_SPOKE` | `backend-stg` variable | the hub the job signs in as and the spoke it becomes, from `platform` |
| `GCP_PROJECT_ID`, `GCP_REGION` | `backend-stg` variable | `frubble-stg`, `us-central1` |
| `GCP_REGISTRY` | `backend-stg` variable | `us-central1-docker.pkg.dev/frubble-stg/frubble-stg` |
| `GCP_RUN_SERVICE` | `backend-stg` variable | `frubble-stg-api` |
| `GCP_RUN_SERVICE_WORKER` | `backend-stg` variable | `frubble-stg-worker`; unset skips the worker rollout |
| `GCP_RUN_JOB_MIGRATE` | `backend-stg` variable | `frubble-stg-migrate`; unset skips the migration |
| `API_HOSTNAME` | `backend-stg` variable | `api.stg.frubble.ai` |
| `GCP_LB_IP` | `backend-stg` variable | the load balancer's address, **only while the hostname still points elsewhere**: the check then goes to that address under the hostname, certificate verified as usual, which needs the certificate active first. Remove it once DNS points at the load balancer |

The `backend-stg` environment accepts deployments from `stg` only. Its name, the workflow
file name and the branch are the identity `platform` trusts; renaming any of them stops the
Google sign-in. No secrets are needed: authentication is OIDC.
