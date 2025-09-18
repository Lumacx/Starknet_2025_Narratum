#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# clean-and-rebuild.sh
# - Frees space (caches, builds, node_modules)
# - Reinstalls with pnpm (web) + npm (functions)
# - Rebuilds Next.js and compiles Functions
#
# Flags:
#   --web-only          Only clean/build the Next.js app
#   --functions-only    Only clean/build Firebase Functions
#   --dev               Skip functions prune (keeps dev deps)
#   --no-store-prune    Skip pnpm store prune (faster)
#
# Usage:
#   bash clean-and-rebuild.sh
#   bash clean-and-rebuild.sh --web-only
#   bash clean-and-rebuild.sh --functions-only --dev
# ============================================================

WEB_ONLY=false
FUNCTIONS_ONLY=false
DEV_MODE=false
SKIP_STORE_PRUNE=false

for arg in "$@"; do
  case "$arg" in
    --web-only) WEB_ONLY=true ;;
    --functions-only) FUNCTIONS_ONLY=true ;;
    --dev) DEV_MODE=true ;;
    --no-store-prune) SKIP_STORE_PRUNE=true ;;
    *) echo "Unknown flag: $arg" >&2; exit 1 ;;
  esac
done

# Pretty helpers
hr() { printf "\n%s\n" "────────────────────────────────────────────────────────"; }
log() { printf "▶ %s\n" "$*"; }
ok() { printf "✅ %s\n" "$*"; }
warn() { printf "⚠️  %s\n" "$*"; }
fail() { printf "❌ %s\n" "$*"; exit 1; }

# Ensure we’re at the repo root (has package.json)
[[ -f package.json ]] || fail "Run this from your project root (where package.json exists)."

# Move caches off /home for this shell (does not persist across sessions)
export npm_config_cache=/tmp/.npm
export PNPM_HOME=/tmp/.pnpm
mkdir -p "$npm_config_cache" "$PNPM_HOME"

# Snapshots (before)
hr; log "Disk snapshot (before):"
df -h | sed -n '1,12p'
hr; log "Top space hogs (before):"
du -sh .[!.]* * 2>/dev/null | sort -h | tail -n 20 || true

clean_web() {
  hr; log "Cleaning Web (Next.js) workspace…"

  # Remove local build artifacts & deps
  rm -rf .next dist out .turbo 2>/dev/null || true
  rm -rf node_modules 2>/dev/null || true

  # Clean pnpm caches (valid commands for pnpm)
  if ! $SKIP_STORE_PRUNE; then
    log "pnpm store prune…"
    pnpm store prune || warn "pnpm store prune failed (continuing)"
  else
    warn "Skipping pnpm store prune (as requested)"
  fi

  log "pnpm cache clean…"
  pnpm cache clean || warn "pnpm cache clean failed (continuing)"

  # Reinstall & build
  if [[ -f pnpm-lock.yaml ]]; then
    log "Installing deps (pnpm --frozen-lockfile)…"
    if ! pnpm install --frozen-lockfile; then
      warn "Lockfile drift — retrying without --frozen-lockfile"
      pnpm install
    fi
  else
    log "No pnpm-lock.yaml found — running pnpm install"
    pnpm install
  fi

  log "Building Next.js…"
  pnpm build

  ok "Web app cleaned & rebuilt."
}

clean_functions() {
  if [[ ! -d functions ]]; then
    warn "No /functions directory found — skipping Functions."
    return 0
  fi

  hr; log "Cleaning Firebase Functions…"
  pushd functions >/dev/null

  rm -rf node_modules lib .tsbuildinfo 2>/dev/null || true

  # Use npm because Functions uses npm in your setup
  if [[ -f package-lock.json ]]; then
    log "Installing Functions deps (npm ci)…"
    npm ci
  else
    warn "No package-lock.json — using npm install"
    npm install
  fi

  if npm run | grep -q "build"; then
    log "Compiling TypeScript → lib/ (npm run build)…"
    npm run build
  else
    warn "No build script found; skipping compilation"
  fi

  if $DEV_MODE; then
    warn "DEV mode: keeping devDependencies (no prune)."
  else
    log "Pruning devDependencies for runtime (npm prune --production)…"
    npm prune --production || warn "npm prune failed (continuing)"
  fi

  popd >/dev/null
  ok "Functions cleaned & built."
}

# Execute
if $WEB_ONLY && $FUNCTIONS_ONLY; then
  fail "Choose at most one of --web-only or --functions-only."
fi

if $WEB_ONLY; then
  clean_web
elif $FUNCTIONS_ONLY; then
  clean_functions
else
  clean_web
  clean_functions
fi

# Snapshots (after)
hr; log "Disk snapshot (after):"
df -h | sed -n '1,12p'
hr; log "Top space hogs (after):"
du -sh .[!.]* * 2>/dev/null | sort -h | tail -n 20 || true

ok "All done."
