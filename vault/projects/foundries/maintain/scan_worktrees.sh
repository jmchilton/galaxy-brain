#!/usr/bin/env bash
# Inventory foundry worktrees: which have outstanding work, which are safe to delete.
#
#   ./scan_worktrees.sh              table, all trees
#   ./scan_worktrees.sh --safe       names only, clean + fully merged (safe to remove)
#   ./scan_worktrees.sh --work       names only, trees with outstanding work
#   ./scan_worktrees.sh --fresh      names only, on the baseline and created recently (leave alone)
#   ./scan_worktrees.sh --idle       names only, on the baseline but old (judgment call)
#   ./scan_worktrees.sh --markdown   regenerate the TREE_MANAGE.md tables
#   ./scan_worktrees.sh --no-fetch   skip the origin fetch (faster, risks a stale baseline)
#
# "Outstanding work" = uncommitted changes, OR commits not reachable from origin/main.
#
# Trees come from `git worktree list --porcelain`, not a directory glob. A glob over
# $BASE/*/ misses nested trees (branch/codex/*), sibling roots (pr/), and anything
# registered outside $BASE entirely — those are exactly the trees that then survive a
# cleanup driven off --safe. Trees outside $BASE are listed by absolute path so they
# can't hide; the main checkout is always excluded.
#
# Note: commits ahead of a tree's *remote branch* are deliberately ignored. Stale remote
# branches left by rebases show huge unpushed counts while the work is already in main;
# ahead-of-origin/main is the only count that says whether anything is at risk.
#
# A tree sitting EXACTLY on the baseline — clean, nothing ahead, nothing behind — has no
# work because it was just created, which every other measure here reads as identical to
# abandoned. Age breaks the tie: within FRESH_DAYS of creation it is "fresh" (a workspace
# someone just set up), older than that it is "idle". Neither is ever listed by --safe.
set -uo pipefail

REPO="${FOUNDRY_REPO:-$HOME/projects/repositories/foundry}"
BASE="${FOUNDRY_WORKTREES:-$HOME/projects/worktrees/foundry}"
BASELINE="${FOUNDRY_BASELINE:-origin/main}"
FRESH_DAYS="${FOUNDRY_FRESH_DAYS:-3}"
mode=table
fetch=1

for arg in "$@"; do
  case "$arg" in
    --safe) mode=safe ;;
    --fresh) mode=fresh ;;
    --idle) mode=idle ;;
    --work) mode=work ;;
    --markdown) mode=markdown ;;
    --no-fetch) fetch=0 ;;
    -h|--help) sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

[ -d "$REPO" ] || { echo "no repo at $REPO" >&2; exit 1; }

if [ "$fetch" -eq 1 ]; then
  echo "fetching $BASELINE ..." >&2
  git -C "$REPO" fetch origin --prune >/dev/null 2>&1 || echo "warn: fetch failed, baseline may be stale" >&2
fi
git -C "$REPO" rev-parse --verify --quiet "$BASELINE" >/dev/null || { echo "no such ref: $BASELINE" >&2; exit 1; }

MAIN=$(git -C "$REPO" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)
MAIN=${MAIN%/.git}

mtime_of() { stat -f %m "$1" 2>/dev/null || stat -c %Y "$1" 2>/dev/null; }

# Registered worktree paths, main checkout and bare entries excluded.
worktree_paths() {
  git -C "$REPO" worktree list --porcelain | awk '
    /^worktree /   { p = substr($0, 10); bare = 0; next }
    /^bare$/       { bare = 1 }
    /^$/           { if (p != "" && !bare) print p; p = ""; bare = 0 }
    END            { if (p != "" && !bare) print p }
  ' | grep -vxF "$MAIN"
}

# name|branch|head|date|tracked|untracked|ahead|behind|age_days
scan() {
  now=$(date +%s)
  while IFS= read -r d; do
    [ -n "$d" ] || continue
    case "$d" in
      "$BASE"/*) name=${d#"$BASE"/} ;;
      *)         name=$d ;;            # registered outside BASE — show the full path
    esac
    if [ ! -e "$d/.git" ]; then
      printf '%s|(MISSING — prunable)|-|-|0|0|0|0|-\n' "$name"
      continue
    fi
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
    born=$(mtime_of "$d/.git")
    if [ -n "$born" ]; then age=$(( (now - born) / 86400 )); else age='-'; fi
    printf '%s|%s|%s|%s|%s|%s|%s|%s|%s\n' "$name" "$branch" "$head" "$date" "$tracked" "$untracked" "$ahead" "$behind" "$age"
  done < <(worktree_paths)
}

data=$(scan)

# A prunable row (registered but the directory is gone) has head "-". It has no counts to
# classify on, so it must fall out of every bucket rather than masquerade as on-baseline.
live='$3 != "-"'
on_baseline='$3 != "-" && $5==0 && $6==0 && $7==0 && $8==0'
is_fresh="$on_baseline && \$9 != \"-\" && \$9 <= $FRESH_DAYS"
is_idle="$on_baseline && !($is_fresh)"
is_safe='$3 != "-" && $5==0 && $6==0 && $7==0 && $8>0'

case "$mode" in
  safe)  printf '%s\n' "$data" | awk -F'|' "$is_safe {print \$1}" ;;
  fresh) printf '%s\n' "$data" | awk -F'|' "$is_fresh {print \$1}" ;;
  idle)  printf '%s\n' "$data" | awk -F'|' "$is_idle {print \$1}" ;;
  work)  printf '%s\n' "$data" | awk -F'|' "$live && !($is_safe) && !($on_baseline) {print \$1}" ;;
  markdown)
    echo "Surveyed $(date +%F) against \`$BASELINE\` @ \`$(git -C "$REPO" rev-parse --short "$BASELINE")\`."
    echo
    echo "### Outstanding work"
    echo
    echo "| Tree | Branch | Last commit | Modified | Untracked | Unmerged | Behind |"
    echo "|---|---|---|---|---|---|---|"
    printf '%s\n' "$data" | awk -F'|' "$live && !($is_safe) && !($on_baseline) {printf \"| \`%s\` | \`%s\` | %s | %s | %s | %s | %s |\n\",\$1,\$2,\$4,\$5,\$6,\$7,\$8}"
    echo
    echo "### Clean + fully merged (safe to delete)"
    echo
    echo "| Tree | Branch | Last commit | Behind |"
    echo "|---|---|---|---|"
    printf '%s\n' "$data" | awk -F'|' "$is_safe {printf \"| \`%s\` | \`%s\` | %s | %s |\n\",\$1,\$2,\$4,\$8}" | sort -t'|' -k4
    echo
    echo "### On the baseline (no work — fresh if recent, idle if not)"
    echo
    echo "| Tree | Branch | Age (days) | Verdict |"
    echo "|---|---|---|---|"
    printf '%s\n' "$data" | awk -F'|' "$is_fresh {printf \"| \`%s\` | \`%s\` | %s | fresh |\n\",\$1,\$2,\$9}"
    printf '%s\n' "$data" | awk -F'|' "$is_idle {printf \"| \`%s\` | \`%s\` | %s | idle |\n\",\$1,\$2,\$9}"
    ;;
  table)
    total=$(printf '%s\n' "$data" | grep -c . || true)
    safe=$(printf '%s\n' "$data" | awk -F'|' "$is_safe" | grep -c . || true)
    fresh=$(printf '%s\n' "$data" | awk -F'|' "$is_fresh" | grep -c . || true)
    idle=$(printf '%s\n' "$data" | awk -F'|' "$is_idle" | grep -c . || true)
    gone=$(printf '%s\n' "$data" | awk -F'|' '$3 == "-"' | grep -c . || true)
    printf '%-40s %-44s %-11s %5s %5s %6s %7s %4s\n' TREE BRANCH DATE MOD UNTR AHEAD BEHIND AGE
    printf '%s\n' "$data" | awk -F'|' '{printf "%-40s %-44s %-11s %5s %5s %6s %7s %4s\n",$1,$2,$4,$5,$6,$7,$8,$9}'
    echo
    echo "$total trees: $safe clean+merged (safe to delete), $((total - safe - fresh - idle - gone)) with outstanding work, $fresh fresh (<=${FRESH_DAYS}d on baseline), $idle idle (on baseline, older)."
    if [ "$gone" -gt 0 ]; then
      echo "$gone registered but missing from disk — run: git -C $REPO worktree prune"
    fi
    ;;
esac
