#!/usr/bin/env bash
# Rolls the Cloud Run service onto IMAGE and proves the API serves COMMIT.
#
# `services update --image` creates a revision that differs from the current
# one by the image only; everything else about the service is the platform
# repository's. It returns non-zero if the revision never becomes ready, and
# traffic stays on the previous revision in that case.
set -euo pipefail
: "${IMAGE:?}" "${SERVICE:?}" "${REGION:?}" "${PROJECT:?}" "${API_HOSTNAME:?}" "${COMMIT:?}"

serving_revision() {
  gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" \
    --format=json | jq -r '[.status.traffic[] | select(.percent == 100) | .revisionName][0] // empty'
}

# Readiness only stops a revision that never starts. If the checks below fail
# after the traffic has moved, the revision that held it before is put back,
# and the run still fails.
previous=$(serving_revision)
[ -n "$previous" ] || { echo "::error::no revision holds 100% of the traffic before the deploy"; exit 1; }

restore_previous() {
  status=$?
  if [ "$status" -ne 0 ]; then
    echo "::warning::deploy failed; restoring traffic to $previous"
    gcloud run services update-traffic "$SERVICE" --project "$PROJECT" --region "$REGION" \
      --to-revisions "$previous=100" --quiet || echo "::error::could not restore $previous"
  fi
  exit "$status"
}
trap restore_previous EXIT

gcloud run services update "$SERVICE" --project "$PROJECT" --region "$REGION" \
  --image "$IMAGE" --quiet

# A rollback pins the traffic to a named revision, and Cloud Run keeps that
# pin across later deploys. A deploy is the roll forward, so it moves the
# traffic back to the latest revision.
gcloud run services update-traffic "$SERVICE" --project "$PROJECT" --region "$REGION" \
  --to-latest --quiet

# The revision holding all traffic must run the image just deployed.
revision=$(serving_revision)
[ -n "$revision" ] || { echo "::error::no revision holds 100% of the traffic"; exit 1; }

# A revision records its image by digest, not by the tag it was deployed
# from, so the comparison is against the digest the tag names in the registry.
digest=$(gcloud artifacts docker images describe "$IMAGE" --format='value(image_summary.digest)')
[ -n "$digest" ] || { echo "::error::no digest in the registry for $IMAGE"; exit 1; }
image=$(gcloud run revisions describe "$revision" --project "$PROJECT" --region "$REGION" \
  --format='value(spec.containers[0].image)')
case "$image" in
  *"@$digest") echo "$revision serves $IMAGE ($digest)" ;;
  *) echo "::error::$revision runs $image, expected $IMAGE ($digest)"; exit 1 ;;
esac

# Through the load balancer, under the public name, with the certificate
# checked. While the hostname still points elsewhere (LB_IP set), the request
# goes to the balancer's address under that name; the certificate is already
# issued, since its DNS authorization record is published before this runs.
curl_args=(-fsS --max-time 20)
if [ -n "${LB_IP:-}" ]; then
  curl_args+=(--resolve "$API_HOSTNAME:443:$LB_IP")
fi

attempts=15
for attempt in $(seq 1 $attempts); do
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
  [ "$attempt" -lt "$attempts" ] && sleep 10
done

echo "::error::https://$API_HOSTNAME/ did not serve $COMMIT"
exit 1
