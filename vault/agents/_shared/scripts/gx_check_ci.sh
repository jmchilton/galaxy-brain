#!/bin/bash
# Print a compact CI failure digest (gh-ci-artifacts --digest), cached per head SHA.
# Usage: gx_check_ci.sh <PR number | PR URL> [--repo OWNER/REPO] [--fresh]
#        gx_check_ci.sh --branch NAME --base UPSTREAM_BASE [--repo OWNER/REPO] [--fresh]
# PR default repo: galaxyproject/galaxy. Branch mode reads fork CI (default repo: <gh user>/galaxy)
# and compares against UPSTREAM_BASE in galaxyproject/galaxy.
# Exit: 0 green, 1 failures, 2 nothing failed yet but runs pending, 3 tool error.
# GH_CI_ARTIFACTS overrides the tool command (default: local clone's dist/cli.js, else npx).
set -eu

usage() { sed -n 3,4p "$0" | sed 's/^# //' >&2; exit 3; }
upstream=galaxyproject/galaxy repo= pr= branch= base= fresh=
while [ $# -gt 0 ]; do
  case $1 in
    --repo) repo=$2; shift ;;
    --branch) branch=$2; shift ;;
    --base) base=$2; shift ;;
    --fresh) fresh=1 ;;
    https://github.com/*/pull/*) repo=$(echo "$1" | cut -d/ -f4-5); pr=$(echo "$1" | cut -d/ -f7) ;;
    [0-9]*) pr=$1 ;;
    *) usage ;;
  esac
  shift
done

local_cli=$HOME/projects/repositories/gh-ci-artifacts/dist/cli.js
if [ -n "${GH_CI_ARTIFACTS:-}" ]; then tool=$GH_CI_ARTIFACTS
elif [ -f "$local_cli" ]; then tool="node $local_cli"
else tool="npx -y gh-ci-artifacts@latest"; fi

if [ -n "$pr" ]; then
  repo=${repo:-$upstream}
  sha=$(gh pr view "$pr" -R "$repo" --json headRefOid --jq .headRefOid)
  key=pr-$pr ref=$pr base_args=()
elif [ -n "$branch" ] && [ -n "$base" ]; then
  repo=${repo:-$(gh api user --jq .login)/galaxy}
  sha=$(gh api "repos/$repo/branches/$branch" --jq .commit.sha)
  key=branch-$(echo "$branch" | tr -c 'A-Za-z0-9._-\n' _) ref=$branch base_args=(--base "$base" --base-repo "$upstream")
else
  usage
fi

root=${XDG_CACHE_HOME:-$HOME/.cache}/gx-check-ci
key_dir=$root/${repo/\//_}/$key
out=$key_dir/${sha:0:12}
mkdir -p "$key_dir"
find "$key_dir" -mindepth 1 -maxdepth 1 ! -name "${sha:0:12}*" -exec rm -rf {} +
find "$root" -mindepth 2 -maxdepth 2 -type d -mtime +7 -exec rm -rf {} +

if [ -n "$fresh" ] || [ ! -f "$out.complete" ]; then
  rm -rf "$out" "$out.complete"
  status=0
  # shellcheck disable=SC2086
  $tool "$ref" --repo "$repo" -o "$out" --config "$(dirname "$0")/gx_check_ci.json" "${base_args[@]+"${base_args[@]}"}" \
    --digest >/dev/null 2>"$out.log" || status=$?
  digest=$(find "$out" -maxdepth 2 -name digest.txt 2>/dev/null | head -1)
  if [ -z "$digest" ]; then
    echo "gh-ci-artifacts failed (exit $status); log: $out.log" >&2
    tail -5 "$out.log" >&2
    exit 3
  fi
  grep -q '^Pending: ' "$digest" || touch "$out.complete"
fi

digest=$(find "$out" -maxdepth 2 -name digest.txt | head -1)
cat "$digest"
echo "Details: $(dirname "$digest") (converted/ = pytest JSON, raw/ = artifacts and job logs)"
if grep -q '^Failed jobs' "$digest"; then exit 1
elif grep -q '^Pending: ' "$digest"; then exit 2
fi
