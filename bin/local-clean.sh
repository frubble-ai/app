#!/usr/bin/env bash
# Removes the containers and their data.
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

require_command docker

docker compose -f "$COMPOSE_FILE" down -v --remove-orphans

echo "Local environment cleaned."
