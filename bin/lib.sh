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
BACKEND_ENV="$ROOT_DIR/apps/backend/.env.local"

# The worker refuses a push without this token locally, where no invoker
# check guards its port. Made once and kept in the backend's .env.local,
# which the worker reads; the subscription carries it in its push URL.
ensure_push_token() {
  [ -f "$BACKEND_ENV" ] || { echo "error: $BACKEND_ENV is missing; copy apps/backend/.env.example" >&2; exit 1; }
  PUSH_TOKEN=$(sed -n 's/^PUSH_TOKEN=//p' "$BACKEND_ENV" | tail -1)
  if [ -z "$PUSH_TOKEN" ]; then
    PUSH_TOKEN=$(openssl rand -hex 32)
    # Written back through the file itself, so it keeps its mode: the copy
    # is private, and `cat >` rewrites the original in place.
    local tmp
    tmp=$(umask 077 && mktemp)
    grep -v '^PUSH_TOKEN=' "$BACKEND_ENV" > "$tmp" || true
    echo "PUSH_TOKEN=$PUSH_TOKEN" >> "$tmp"
    cat "$tmp" > "$BACKEND_ENV"
    rm -f "$tmp"
  fi
}

# The emulator keeps topics and subscriptions in memory, so every start of it
# needs them again. PUT creates; 409 means it exists, which is the state wanted.
ensure_pubsub() {
  ensure_push_token
  local base="http://$PUBSUB_HOST/v1/projects/$PUBSUB_PROJECT"
  echo "Waiting for the Pub/Sub emulator..."
  for _ in $(seq 1 60); do
    if curl -fsS "$base/topics" >/dev/null 2>&1; then break; fi
    sleep 1
  done
  curl -fsS "$base/topics" >/dev/null || { echo "error: the Pub/Sub emulator did not come up on $PUBSUB_HOST" >&2; exit 1; }
  put_pubsub "$base/topics/$PUBSUB_TOPIC" '{}'
  local push_config="{\"pushEndpoint\":\"http://host.docker.internal:$WORKER_PORT/push/emails?token=$PUSH_TOKEN\"}"
  put_pubsub "$base/subscriptions/$PUBSUB_TOPIC-worker" \
    "{\"topic\":\"projects/$PUBSUB_PROJECT/topics/$PUBSUB_TOPIC\",\"pushConfig\":$push_config,\"ackDeadlineSeconds\":30}"
  # A subscription that already existed keeps its push URL; set it again, so
  # a new token or worker port reaches it too.
  # The body carries the token, so it goes in through stdin: a command-line
  # argument is readable by every user in the process list.
  printf '%s' "{\"pushConfig\":$push_config}" \
    | curl -fsS -X POST "$base/subscriptions/$PUBSUB_TOPIC-worker:modifyPushConfig" \
      -H 'Content-Type: application/json' --data-binary @- >/dev/null \
    || { echo "error: could not update the push subscription's URL" >&2; exit 1; }
}

put_pubsub() {
  local status
  # Body through stdin, not `-d`: the subscription's carries the push token.
  status=$(printf '%s' "$2" | curl -sS -o /dev/null -w '%{http_code}' -X PUT "$1" -H 'Content-Type: application/json' --data-binary @-)
  case "$status" in
    200|409) ;;
    *) echo "error: $1 answered $status" >&2; exit 1 ;;
  esac
}
