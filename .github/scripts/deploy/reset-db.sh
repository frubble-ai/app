#!/usr/bin/env bash
# Drops what the migrations made in the environment's database and runs the
# migrations again, as one execution of the migration job with `--reset`
# (apps/backend/scripts/migrate.ts), on the image the job already has. The
# script itself refuses `--reset` in prd. The services then roll onto that
# same image, so the revision that serves matches the schema just made.
set -euo pipefail
: "${MIGRATE_JOB:?}" "${SERVICE:?}" "${API_HOSTNAME:?}" "${REGION:?}" "${PROJECT:?}"

# The job's image is the one the last deploy built; its tag is that commit.
IMAGE=$(gcloud run jobs describe "$MIGRATE_JOB" --project "$PROJECT" --region "$REGION" \
  --format='value(spec.template.spec.template.spec.containers[0].image)')
[ -n "$IMAGE" ] || { echo "::error::$MIGRATE_JOB has no image"; exit 1; }
export IMAGE COMMIT="${IMAGE##*:}"

# --args replaces the job's arguments for this execution only; its command,
# env, secrets and identity stay the platform repository's. --wait returns
# non-zero when the execution fails.
gcloud run jobs execute "$MIGRATE_JOB" --project "$PROJECT" --region "$REGION" \
  --args=--reset --wait --quiet
echo "✅ $MIGRATE_JOB reset the database and migrated it on $IMAGE"

scripts=$(dirname "$0")
"$scripts/rollout.sh"
if [ -n "${WORKER_SERVICE:-}" ]; then
  SERVICE="$WORKER_SERVICE" API_HOSTNAME="" "$scripts/rollout.sh"
fi
