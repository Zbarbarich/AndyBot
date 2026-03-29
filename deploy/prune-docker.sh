#!/usr/bin/env bash
# Free disk after deploy: drop stopped containers, unused images, cap BuildKit cache.
# Keeps only images referenced by running containers (one live generation) and limits
# build cache so roughly ~2 recent deploys' worth of npm layers can remain (tune MAX_BUILD_CACHE).
# Run from repo root after `docker compose up -d`.
set -euo pipefail

echo "Pruning stopped containers..."
docker container prune -f

echo "Removing unused images (not referenced by any container)..."
docker image prune -a -f

# Cap BuildKit/npm cache; requires Docker Engine ~23+ for --max-used-space
MAX_BUILD_CACHE="${MAX_BUILD_CACHE:-3GB}"
echo "Trimming build cache (max ${MAX_BUILD_CACHE})..."
if docker builder prune -f --max-used-space "$MAX_BUILD_CACHE" 2>/dev/null; then
  echo "Build cache capped at ${MAX_BUILD_CACHE} (default builder)."
elif docker buildx prune -f --max-used-space "$MAX_BUILD_CACHE" 2>/dev/null; then
  echo "Build cache capped at ${MAX_BUILD_CACHE} (buildx)."
else
  docker builder prune -f || true
  echo "Note: for tighter cache caps, use Docker 23+ with BuildKit (docker builder prune --max-used-space)."
fi

docker system df
