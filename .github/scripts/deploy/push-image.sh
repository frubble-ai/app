#!/usr/bin/env bash
# Pushes the built image to Artifact Registry unless its tag is already there.
# A tag is pushed once and never pushed over: a re-run of a commit reuses the
# image its first run pushed. That image passed the scan of its own run, not
# this one, so it is scanned again here with the current rules before it is
# allowed to deploy.
set -euo pipefail
: "${IMAGE:?registry path and tag}" "${LOCAL_IMAGE:?tag the build job used}" "${IMAGE_TAR:?path to the image tarball}"

# IMAGE is composed in the workflow from GCP_REGISTRY; unset, it still passes
# the guard above as "/frubble-backend:<sha>" and fails later with an empty host.
registry="${IMAGE%%/*}"
if [ -z "$registry" ] || [ "$registry" = "$IMAGE" ]; then
  echo "::error::IMAGE has no registry host: '$IMAGE'. Is GCP_REGISTRY set on the environment?"
  exit 1
fi

gcloud auth configure-docker "$registry" --quiet

if gcloud artifacts docker images describe "$IMAGE" >/dev/null 2>&1; then
  echo "$IMAGE is already in the registry; scanning it instead of pushing"
  trivy image --severity CRITICAL --exit-code 1 "$IMAGE"
  exit 0
fi

docker load --input "$IMAGE_TAR"
docker tag "$LOCAL_IMAGE" "$IMAGE"
docker push "$IMAGE"
