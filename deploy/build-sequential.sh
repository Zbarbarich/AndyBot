#!/usr/bin/env bash
# Build images one at a time to avoid ECONNRESET from too many parallel npm registry
# connections. Run from repo root: ./deploy/build-sequential.sh
set -e
COMPOSE_FILE="${1:-deploy/docker-compose.yml}"
ENV_FILE="${2:-deploy/.env}"
SERVICES=(auth-service customer-service ticket-service order-service invoice-service pdf-service api-gateway frontend)
for svc in "${SERVICES[@]}"; do
  echo "Building $svc..."
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build "$svc"
done
echo "Starting all services..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
