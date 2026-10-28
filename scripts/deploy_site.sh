#!/usr/bin/env bash
# Build the Astro site from a clean origin/main worktree and rsync it to jmchilton.net.
# Usage: scripts/deploy_site.sh [--dry-run] [--working-tree] [--ref <git-ref>]
set -euo pipefail

DEPLOY_HOST="${DEPLOY_HOST:-deploy@jmchilton.net}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/galaxy-brain.jmchilton.net}"
REF="origin/main"
DRY_RUN=""
WORKING_TREE=""

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN="--dry-run" ;;
    --working-tree) WORKING_TREE=1 ;;
    --ref) REF="$2"; shift ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
  shift
done

REPO="$(cd "$(dirname "$0")/.." && pwd)"

if [ -n "$WORKING_TREE" ]; then
  BUILD_ROOT="$REPO"
else
  git -C "$REPO" fetch -q origin
  SHA="$(git -C "$REPO" rev-parse --short "$REF")"
  BUILD_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/gb-deploy-${SHA}-XXXX")"
  trap 'git -C "$REPO" worktree remove --force "$BUILD_ROOT"' EXIT
  git -C "$REPO" worktree add -q --detach "$BUILD_ROOT" "$REF"
  # Copy-on-write clone of deps (macOS); not a symlink, since Astro caches content in node_modules/.astro.
  cp -cR "$REPO/site/node_modules" "$BUILD_ROOT/site/node_modules"
  rm -rf "$BUILD_ROOT/site/node_modules/.astro" "$BUILD_ROOT/site/node_modules/.vite"
  echo "building $REF ($SHA) in $BUILD_ROOT"
fi

(cd "$BUILD_ROOT/site" && npm run build)

# -c: Astro rewrites every file each build, so mtimes are useless for change detection.
rsync -rlz -c --delete-after --delay-updates --stats $DRY_RUN \
  "$BUILD_ROOT/site/dist/" "$DEPLOY_HOST:$DEPLOY_PATH/"
