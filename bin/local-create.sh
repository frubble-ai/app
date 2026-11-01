#!/usr/bin/env bash
# Starts the local dependencies and creates the Pub/Sub topic and its push
# subscription to the worker on the host.
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

require_command docker
require_command curl

docker compose -f "$COMPOSE_FILE" up -d --wait
ensure_pubsub

echo "Local environment ready."
echo "  Postgres:   $DB_HOST:$DB_PORT/$DB_NAME"
echo "  Pub/Sub:    $PUBSUB_HOST (topic $PUBSUB_TOPIC, pushing to the worker on port $WORKER_PORT)"
