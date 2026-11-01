#!/usr/bin/env bash
# Starts the local dependencies and creates the Pub/Sub topic and its push
# subscription to the worker on the host.
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

require_command docker
require_command curl

PUBSUB_HOST="${PUBSUB_EMULATOR_HOST:-localhost:8085}"
PROJECT="${PUBSUB_PROJECT_ID:-frubble-local}"
TOPIC="${PUBSUB_EMAILS_TOPIC:-emails}"
WORKER_PORT="${WORKER_PORT:-8081}"

docker compose -f "$COMPOSE_FILE" up -d --wait

base="http://$PUBSUB_HOST/v1/projects/$PROJECT"

echo "Waiting for the Pub/Sub emulator..."
for _ in $(seq 1 60); do
  if curl -fsS "$base/topics" >/dev/null 2>&1; then break; fi
  sleep 1
done
curl -fsS "$base/topics" >/dev/null || { echo "error: the Pub/Sub emulator did not come up on $PUBSUB_HOST" >&2; exit 1; }

# PUT creates; 409 means it exists, which is the state wanted. Anything else
# is an error worth seeing.
ensure() {
  local status
  status=$(curl -sS -o /dev/null -w '%{http_code}' -X PUT "$1" -H 'Content-Type: application/json' -d "$2")
  case "$status" in
    200|409) ;;
    *) echo "error: $1 answered $status" >&2; exit 1 ;;
  esac
}
ensure "$base/topics/$TOPIC" '{}'
ensure "$base/subscriptions/$TOPIC-worker" \
  "{\"topic\":\"projects/$PROJECT/topics/$TOPIC\",\"pushConfig\":{\"pushEndpoint\":\"http://host.docker.internal:$WORKER_PORT/push/emails\"},\"ackDeadlineSeconds\":30}"

echo "Local environment ready."
echo "  Postgres:   $DB_HOST:$DB_PORT/$DB_NAME"
echo "  Pub/Sub:    $PUBSUB_HOST (topic $TOPIC, pushing to the worker on port $WORKER_PORT)"
