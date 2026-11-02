#!/usr/bin/env bash
# Runs the database migration as an execution of the migration job, on IMAGE,
# before the services roll onto it. The job's definition (env, secrets, the
# identity it runs as, SHOULD_RUN_MIGRATION) is the platform repository's;
# this only moves its image and runs it once.
#
# A failed migration stops the deploy here: the services keep serving on the
# previous image, against a schema the migration left as it found it (every
# migration runs in a transaction).
set -euo pipefail
: "${IMAGE:?}" "${REGION:?}" "${PROJECT:?}"

if [ -z "${MIGRATE_JOB:-}" ]; then
  echo "::notice::GCP_RUN_JOB_MIGRATE is unset; no migration job to run"
  exit 0
fi

gcloud run jobs update "$MIGRATE_JOB" --project "$PROJECT" --region "$REGION" \
  --image "$IMAGE" --quiet

# --wait returns non-zero when the execution fails, and prints its name.
gcloud run jobs execute "$MIGRATE_JOB" --project "$PROJECT" --region "$REGION" \
  --wait --quiet
echo "✅ $MIGRATE_JOB ran on $IMAGE"
