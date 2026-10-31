#!/usr/bin/env bash
# Rolls the Cloud Run service onto IMAGE and proves the API serves COMMIT.
#
# `services update --image` creates a revision that differs from the current
# one by the image only; everything else about the service is the platform
# repository's. It returns non-zero if the revision never becomes ready, and
# traffic stays on the previous revision in that case.
set -euo pipefail
: "${IMAGE:?}" "${SERVICE:?}" "${REGION:?}" "${PROJECT:?}" "${API_HOSTNAME:?}" "${COMMIT:?}"

gcloud run services update "$SERVICE" --project "$PROJECT" --region "$REGION" \
  --image "$IMAGE" --quiet

# A rollback pins the traffic to a named revision, and Cloud Run keeps that
# pin across later deploys. A deploy is the roll forward, so it moves the
# traffic back to the latest revision.
gcloud run services update-traffic "$SERVICE" --project "$PROJECT" --region "$REGION" \
  --to-latest --quiet

# The revision holding all traffic must run the image just deployed.
revision=$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" \
  --format=json | jq -r '.status.traffic[] | select(.percent == 100) | .revisionName')
[ -n "$revision" ] || { echo "::error::no revision holds 100% of the traffic"; exit 1; }

image=$(gcloud run revisions describe "$revision" --project "$PROJECT" --region "$REGION" \
  --format='value(spec.containers[0].image)')
if [ "$image" != "$IMAGE" ]; then
  echo "::error::$revision runs $image, expected $IMAGE"
  exit 1
fi
echo "$revision serves $IMAGE"

# Through the load balancer, under the public name. While the hostname still
# points elsewhere (LB_IP set), the request goes to the balancer's address
# under that name, and the certificate, not issued until the name moves, is
# not checked.
curl_args=(-fsS --max-time 20)
if [ -n "${LB_IP:-}" ]; then
  curl_args+=(--resolve "$API_HOSTNAME:443:$LB_IP" -k)
fi

for attempt in $(seq 1 15); do
  if body=$(curl "${curl_args[@]}" "https://$API_HOSTNAME/"); then
    served=$(jq -r '.commit // empty' <<<"$body" 2>/dev/null || true)
    if [ "$served" = "$COMMIT" ]; then
      echo "✅ https://$API_HOSTNAME/ serves $COMMIT"
      exit 0
    fi
    echo "attempt $attempt: the hostname serves '${served:-something else}'"
  else
    echo "attempt $attempt: no answer yet"
  fi
  sleep 10
done

echo "::error::https://$API_HOSTNAME/ did not serve $COMMIT"
exit 1
