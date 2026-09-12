#!/usr/bin/env bash
# Inventory foundry worktrees: which have outstanding work, which are safe to delete.
#
#   ./scan_worktrees.sh              table, all trees
#   ./scan_worktrees.sh --safe       names only, clean + fully merged (safe to remove)
#   ./scan_worktrees.sh --work       names only, trees with outstanding work
#   ./scan_worktrees.sh --fresh      names only, sitting exactly on the baseline (new, never used)
#   ./scan_worktrees.sh --markdown   regenerate the TREE_MANAGE.md tables
#   ./scan_worktrees.sh --no-fetch   skip the origin fetch (faster, risks a stale baseline)
#
# "Outstanding work" = uncommitted changes, OR commits not reachable from origin/main.
#
# A tree sitting EXACTLY on the baseline — clean, nothing ahead, nothing behind — is reported
# as "fresh", not "safe", and --safe never lists it. It has no work because it was just created,
# which is indistinguishable from abandoned by every other measure here and is the one case where
# deleting on this script's say-so would destroy a workspace someone just set up.
# Note: commits ahead of a tree's *remote branch* are deliberately ignored. Stale remote
# branches left by rebases show huge unpushed counts while the work is already in main;
# ahead-of-origin/main is the only count that says whether anything is at risk.
set -uo pipefail

REPO="${FOUNDRY_REPO:-$HOME/projects/repositories/foundry}"
BASE="${FOUNDRY_WORKTREES:-$HOME/projects/worktrees/foundry/branch}"
BASELINE="${FOUNDRY_BASELINE:-origin/main}"
mode=table
fetch=1

for arg in "$@"; do
  case "$arg" in
    --safe) mode=safe ;;
    --fresh) mode=fresh ;;
    --work) mode=work ;;
    --markdown) mode=markdown ;;
    --no-fetch) fetch=0 ;;
    -h|--help) sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

[ -d "$REPO" ]  || { echo "no repo at $REPO" >&2; exit 1; }
[ -d "$BASE" ]  || { echo "no worktree dir at $BASE" >&2; exit 1; }

if [ "$fetch" -eq 1 ]; then
  echo "fetching $BASELINE ..." >&2
  git -C "$REPO" fetch origin --prune >/dev/null 2>&1 || echo "warn: fetch failed, baseline may be stale" >&2
fi
git -C "$REPO" rev-parse --verify --quiet "$BASELINE" >/dev/null || { echo "no such ref: $BASELINE" >&2; exit 1; }

# name|branch|head|date|tracked|untracked|ahead|behind
scan() {
  for d in "$BASE"/*/; do
    [ -d "$d/.git" ] || [ -f "$d/.git" ] || continue
    name=$(basename "$d")
    branch=$(git -C "$d" symbolic-ref --quiet --short HEAD 2>/dev/null) || branch="(detached)"
    head=$(git -C "$d" rev-parse --short HEAD 2>/dev/null) || continue
    date=$(git -C "$d" log -1 --format='%ci' HEAD 2>/dev/null | cut -d' ' -f1)
    porc=$(git -C "$d" status --porcelain 2>/dev/null)
    if [ -z "$porc" ]; then tracked=0; untracked=0
    else
      untracked=$(printf '%s\n' "$porc" | grep -c '^??' || true)
      tracked=$(printf '%s\n' "$porc" | grep -vc '^??' || true)
    fi
    ahead=$(git -C "$d" rev-list --count "$BASELINE..HEAD" 2>/dev/null || echo 0)
    behind=$(git -C "$d" rev-list --count "HEAD..$BASELINE" 2>/dev/null || echo 0)
    printf '%s|%s|%s|%s|%s|%s|%s|%s\n' "$name" "$branch" "$head" "$date" "$tracked" "$untracked" "$ahead" "$behind"
  done
}

data=$(scan)

is_fresh='$5==0 && $6==0 && $7==0 && $8==0'
is_safe='$5==0 && $6==0 && $7==0 && $8>0'

case "$mode" in
  safe) printf '%s\n' "$data" | awk -F'|' "$is_safe {print \$1}" ;;
  fresh) printf '%s\n' "$data" | awk -F'|' "$is_fresh {print \$1}" ;;
  work) printf '%s\n' "$data" | awk -F'|' "!($is_safe) && !($is_fresh) {print \$1}" ;;
  markdown)
    echo "Surveyed $(date +%F) against \`$BASELINE\` @ \`$(git -C "$REPO" rev-parse --short "$BASELINE")\`."
    echo
    echo "### Outstanding work"
    echo
    echo "| Tree | Branch | Last commit | Modified | Untracked | Unmerged | Behind |"
    echo "|---|---|---|---|---|---|---|"
    printf '%s\n' "$data" | awk -F'|' "!($is_safe) && !($is_fresh) {printf \"| \`%s\` | \`%s\` | %s | %s | %s | %s | %s |\n\",\$1,\$2,\$4,\$5,\$6,\$7,\$8}"
    echo
    echo "### Clean + fully merged (safe to delete)"
    echo
    echo "| Tree | Branch | Last commit | Behind |"
    echo "|---|---|---|---|"
    printf '%s\n' "$data" | awk -F'|' "$is_safe {printf \"| \`%s\` | \`%s\` | %s | %s |\n\",\$1,\$2,\$4,\$8}" | sort -t'|' -k4
    ;;
  table)
    total=$(printf '%s\n' "$data" | grep -c . || true)
    safe=$(printf '%s\n' "$data" | awk -F'|' "$is_safe" | grep -c . || true)
    fresh=$(printf '%s\n' "$data" | awk -F'|' "$is_fresh" | grep -c . || true)
    printf '%-32s %-42s %-11s %5s %5s %6s %7s\n' TREE BRANCH DATE MOD UNTR AHEAD BEHIND
    printf '%s\n' "$data" | awk -F'|' '{printf "%-32s %-42s %-11s %5s %5s %6s %7s\n",$1,$2,$4,$5,$6,$7,$8}'
    echo
    echo "$total trees: $safe clean+merged (safe to delete), $((total - safe - fresh)) with outstanding work, $fresh fresh (on baseline, never used)."
    ;;
esac
