#!/usr/bin/env bash
# Shared by the local-*.sh scripts: the root .env.local and the compose file.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"

if [ -f "$ROOT_DIR/.env.local" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env.local"
  set +a
fi

export DB_HOST="${DB_HOST:-localhost}"
export DB_PORT="${DB_PORT:-5432}"
export DB_NAME="${DB_NAME:-frubble}"
export DB_USER="${DB_USER:-frubble}"
export DB_PASSWORD="${DB_PASSWORD:-frubble_dev}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "error: $1 is required" >&2
    exit 1
  fi
}

PUBSUB_HOST="${PUBSUB_EMULATOR_HOST:-localhost:8085}"
PUBSUB_PROJECT="${PUBSUB_PROJECT_ID:-frubble-local}"
PUBSUB_TOPIC="${PUBSUB_EMAILS_TOPIC:-emails}"
WORKER_PORT="${WORKER_PORT:-8081}"

# The emulator keeps topics and subscriptions in memory, so every start of it
# needs them again. PUT creates; 409 means it exists, which is the state wanted.
ensure_pubsub() {
  local base="http://$PUBSUB_HOST/v1/projects/$PUBSUB_PROJECT"
  echo "Waiting for the Pub/Sub emulator..."
  for _ in $(seq 1 60); do
    if curl -fsS "$base/topics" >/dev/null 2>&1; then break; fi
    sleep 1
  done
  curl -fsS "$base/topics" >/dev/null || { echo "error: the Pub/Sub emulator did not come up on $PUBSUB_HOST" >&2; exit 1; }
  put_pubsub "$base/topics/$PUBSUB_TOPIC" '{}'
  put_pubsub "$base/subscriptions/$PUBSUB_TOPIC-worker" \
    "{\"topic\":\"projects/$PUBSUB_PROJECT/topics/$PUBSUB_TOPIC\",\"pushConfig\":{\"pushEndpoint\":\"http://host.docker.internal:$WORKER_PORT/push/emails\"},\"ackDeadlineSeconds\":30}"
}

put_pubsub() {
  local status
  status=$(curl -sS -o /dev/null -w '%{http_code}' -X PUT "$1" -H 'Content-Type: application/json' -d "$2")
  case "$status" in
    200|409) ;;
    *) echo "error: $1 answered $status" >&2; exit 1 ;;
  esac
}
