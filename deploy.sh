#!/bin/bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Golink Suite — Deploy Script
#
# Usage:
#   ./deploy.sh sandbox              Deploy transact-api to sandbox only
#   ./deploy.sh production           Deploy transact-api to production only
#   ./deploy.sh all                  Deploy to sandbox then production
#
# Workflow:
#   1. Always deploy to sandbox first and confirm it's healthy
#   2. Only deploy to production after sandbox is confirmed
#   3. Never deploy directly to production without going through sandbox
# ---------------------------------------------------------------------------

TARGET="${1:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[deploy]${NC} $1"; }
warn() { echo -e "${YELLOW}[deploy]${NC} $1"; }
fail() { echo -e "${RED}[deploy] ERROR:${NC} $1"; exit 1; }

if [[ -z "$TARGET" ]]; then
  echo "Usage: $0 sandbox | production | all"
  exit 1
fi

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
build() {
  log "Building transact-api..."
  npm exec nx build transact-api
  log "Build complete."
}

# ---------------------------------------------------------------------------
# Health check — waits up to 30s for the API to respond
# ---------------------------------------------------------------------------
health_check() {
  local url="$1"
  local label="$2"
  log "Health check: $label ($url)..."
  for i in {1..10}; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    if [[ "$STATUS" == "200" ]]; then
      log "$label is healthy (HTTP $STATUS)."
      return 0
    fi
    warn "Attempt $i/10 — got HTTP $STATUS, retrying in 3s..."
    sleep 3
  done
  fail "$label did not become healthy after 30s. Aborting."
}

# ---------------------------------------------------------------------------
# Deploy targets
# ---------------------------------------------------------------------------
deploy_sandbox() {
  log "Deploying to SANDBOX..."
  docker restart transact-api-sandbox
  health_check "https://sandbox.transact.golink.co.ls/api/docs-json" "Sandbox"
  log "Sandbox deploy complete."
}

deploy_production() {
  log "Deploying to PRODUCTION..."
  docker restart transact-api
  health_check "https://transact.golink.co.ls/api/docs-json" "Production"
  log "Production deploy complete."
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
build

case "$TARGET" in
  sandbox)
    deploy_sandbox
    ;;
  production)
    warn "Deploying directly to production. Have you tested in sandbox first?"
    read -r -p "Type 'yes' to confirm: " CONFIRM
    [[ "$CONFIRM" == "yes" ]] || fail "Aborted."
    deploy_production
    ;;
  all)
    deploy_sandbox
    log ""
    log "Sandbox is healthy. Proceeding to production in 5 seconds..."
    log "Press Ctrl+C to abort."
    sleep 5
    deploy_production
    ;;
  *)
    fail "Unknown target '$TARGET'. Use: sandbox | production | all"
    ;;
esac

log ""
log "Deploy finished successfully."
