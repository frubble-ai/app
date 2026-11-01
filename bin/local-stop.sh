#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

require_command docker

docker compose -f "$COMPOSE_FILE" stop

echo "Local environment stopped."
