#!/usr/bin/env bash
# Pushes the built image to Artifact Registry unless its tag is already there.
# Tags are immutable in the registry, so a re-run of a commit reuses the image
# it pushed the first time instead of failing on the push.
set -euo pipefail
: "${IMAGE:?registry path and tag}" "${LOCAL_IMAGE:?tag the build job used}" "${IMAGE_TAR:?path to the image tarball}"

if gcloud artifacts docker images describe "$IMAGE" >/dev/null 2>&1; then
  echo "$IMAGE is already in the registry; nothing to push"
  exit 0
fi

gcloud auth configure-docker "${IMAGE%%/*}" --quiet
docker load --input "$IMAGE_TAR"
docker tag "$LOCAL_IMAGE" "$IMAGE"
docker push "$IMAGE"
