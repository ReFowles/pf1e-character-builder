#!/usr/bin/env bash
#
# Build the PF1e sheet locally and ship it to the droplet.
#
# It's a static site, so nothing runs on the droplet: Nginx serves
# /var/www/pf1e/current. Each deploy uploads to a fresh release directory and
# flips the `current` symlink, so a failed upload never leaves a half-updated site.
#
# Usage: scripts/deploy.sh            (after committing and pushing to main)
#        HOST=deploy@1.2.3.4 scripts/deploy.sh
set -euo pipefail

HOST="${HOST:-deploy@167.172.215.72}"
SITE="${SITE:-https://pf1e.mendicino.me}"
ROOT=/var/www/pf1e
KEEP=3

cd "$(dirname "$0")/.."

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "Working tree has uncommitted changes; commit first so the deploy matches git." >&2
  exit 1
fi

pnpm install --frozen-lockfile
pnpm test
pnpm check
pnpm build

RELEASE="$(date +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD)"
ssh "$HOST" "mkdir -p $ROOT/releases/$RELEASE"
rsync -az --delete dist/ "$HOST:$ROOT/releases/$RELEASE/"
# Swap the symlink atomically, then prune old releases.
ssh "$HOST" "ln -sfn $ROOT/releases/$RELEASE $ROOT/current.new && mv -T $ROOT/current.new $ROOT/current && cd $ROOT/releases && ls -1t | tail -n +$((KEEP + 1)) | xargs -r rm -rf"

echo "Deployed $RELEASE"
curl -fsSI "$SITE" | head -1
