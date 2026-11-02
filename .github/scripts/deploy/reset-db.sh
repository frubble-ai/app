#!/usr/bin/env bash
# Drops what the migrations made in the environment's database and runs the
# migrations again, as one execution of the migration job with `--reset`
# (apps/backend/scripts/migrate.ts), on the image the job already has. The
# script itself refuses `--reset` in prd.
set -euo pipefail
: "${MIGRATE_JOB:?}" "${REGION:?}" "${PROJECT:?}"

# --args replaces the job's arguments for this execution only; its command,
# env, secrets and identity stay the platform repository's. --wait returns
# non-zero when the execution fails.
gcloud run jobs execute "$MIGRATE_JOB" --project "$PROJECT" --region "$REGION" \
  --args=--reset --wait --quiet
echo "✅ $MIGRATE_JOB reset the database and migrated it"
