#!/usr/bin/env bash
# Starts the stopped dependencies. The emulator forgets its topics when it
# stops, so they are created again.
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

require_command docker
require_command curl
require_command openssl

docker compose -f "$COMPOSE_FILE" start
ensure_pubsub

echo "Local environment started."
