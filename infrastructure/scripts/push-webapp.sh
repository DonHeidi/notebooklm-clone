#!/usr/bin/env bash
# Build the webapp image and push it to the Scaleway registry namespace.
# Interim manual path until B2 wires CI. Run from anywhere via varlock:
#   bunx varlock run -- ./infrastructure/scripts/push-webapp.sh [tag]
# Needs: SCW_SECRET_KEY in the environment; docker; terraform state with the
# registry namespace applied (or pass REGISTRY explicitly).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TAG="${1:-latest}"
REGISTRY="${REGISTRY:-$(cd "$REPO_ROOT/infrastructure" && mise exec -- terraform output -raw container_registry_endpoint)}"

: "${SCW_SECRET_KEY:?SCW_SECRET_KEY must be set (via varlock)}"

echo "Building $REGISTRY/webapp:$TAG"
docker build -f "$REPO_ROOT/apps/webapp/Dockerfile" -t "$REGISTRY/webapp:$TAG" "$REPO_ROOT"

echo "$SCW_SECRET_KEY" | docker login "$REGISTRY" -u nologin --password-stdin
docker push "$REGISTRY/webapp:$TAG"
