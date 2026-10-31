#!/usr/bin/env bash
# Pushes the built image to Artifact Registry unless its tag is already there.
# Tags are immutable in the registry, so a re-run of a commit reuses the image
# it pushed the first time instead of failing on the push. That image passed
# the scan of its own run, not this one, so it is scanned again here with the
# current rules before it is allowed to deploy.
set -euo pipefail
: "${IMAGE:?registry path and tag}" "${LOCAL_IMAGE:?tag the build job used}" "${IMAGE_TAR:?path to the image tarball}"

gcloud auth configure-docker "${IMAGE%%/*}" --quiet

if gcloud artifacts docker images describe "$IMAGE" >/dev/null 2>&1; then
  echo "$IMAGE is already in the registry; scanning it instead of pushing"
  trivy image --severity CRITICAL --exit-code 1 "$IMAGE"
  exit 0
fi

docker load --input "$IMAGE_TAR"
docker tag "$LOCAL_IMAGE" "$IMAGE"
docker push "$IMAGE"
