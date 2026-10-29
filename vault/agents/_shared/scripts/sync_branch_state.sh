#!/bin/bash
# Query GitHub for every PR behind a MY_BRANCHES.md; print TSV.
# Usage: sync_branch_state.sh <MY_BRANCHES.md> <OWNER/REPO> <vault/repositories/PROJECT/branches dir>
# An entry's PR is the last PR link on its line, else `pr:` in its record, else gh_user's newest PR from that head branch. Empty fields print as `-`.
set -eu

. "$(dirname "$0")/sync_common.sh"

[ $# -eq 3 ] || { echo "usage: $0 <MY_BRANCHES.md> <OWNER/REPO> <branches_dir>" >&2; exit 2; }
index=$1 repo=$2 dir=$3

queue=$(awk -v repo="$repo" '
  /^## / { section = "-"; if (match($0, /\(`[a-z_]+`\)$/)) section = substr($0, RSTART + 2, RLENGTH - 4) }
  /^- \[`/ {
    branch = $0; sub(/^- \[`/, "", branch); sub(/`.*/, "", branch)
    record = "-"; if (match($0, /\(active\/[^)\/]+\//)) record = substr($0, RSTART + 8, RLENGTH - 9)
    pr = "-"; line = $0
    while (match(line, "github.com/" repo "/pull/[0-9]+")) { pr = substr(line, RSTART, RLENGTH); sub(/.*\//, "", pr); line = substr(line, RSTART + RLENGTH) }
    print section "\t" branch "\t" record "\t" pr
  }' "$index")

user_prs=$(gh pr list -R "$repo" --author "$(gh_user)" --state all --limit 300 --json number,headRefName --jq '.[]|[.number,.headRefName]|@tsv')

resolved=$(printf '%s\n' "$queue" | while IFS=$'\t' read -r section branch record pr; do
  [ -n "$branch" ] || continue
  if [ "$pr" = - ] && [ -f "$dir/active/$record/index.md" ]; then
    pr=$(awk 'NR == 1 && $0 != "---" { exit } NR > 1 && $0 == "---" { exit } /^pr: *[0-9]+/ { sub(/^pr: */, ""); print $1; exit }' "$dir/active/$record/index.md")
  fi
  if [ -z "$pr" ] || [ "$pr" = - ]; then
    pr=$(printf '%s\n' "$user_prs" | awk -F'\t' -v b="$branch" '$2 == b { print $1; exit }')
  fi
  printf '%s\t%s\t%s\t%s\n' "$section" "$branch" "$record" "${pr:--}"
done)

echo "## queue: section branch record pr"
printf '%s\n' "$resolved"

records=$(printf '%s\n' "$resolved" | cut -f3 | grep -vx -- - | sort -u || true)
dirs=$(find "$dir/active" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; 2>/dev/null | sort -u || true)
echo "## queue entry with no record link: $(printf '%s\n' "$resolved" | awk -F'\t' '$3 == "-" { print $2 }' | tr '\n' ' ')"
echo "## queue entry with no active record: $(comm -23 <(printf '%s\n' "$records") <(printf '%s\n' "$dirs") | tr '\n' ' ')"
echo "## active record with no queue entry: $(comm -13 <(printf '%s\n' "$records") <(printf '%s\n' "$dirs") | tr '\n' ' ')"

pr_row() {
  gh pr view "$1" -R "$repo" --json number,state,mergedAt,closedAt,isDraft,mergeable,reviewDecision,headRefOid,headRefName,statusCheckRollup \
    --jq '[.number,.state,.mergedAt,.closedAt,.isDraft,.mergeable,.reviewDecision,.headRefOid,
      ([.statusCheckRollup[]?|(.conclusion // .state // "")]|"\(map(select(.=="SUCCESS" or .=="NEUTRAL" or .=="SKIPPED"))|length)/\(map(select(.=="FAILURE" or .=="ERROR" or .=="TIMED_OUT" or .=="CANCELLED"))|length)/\(map(select(.==""or .=="PENDING"))|length)"),
      .headRefName]|@tsv'
}

echo "## PRs: number state mergedAt closedAt isDraft mergeable reviewDecision headRefOid checks(pass/fail/pending) headRefName"
printf '%s\n' "$resolved" | cut -f4 | grep -E '^[0-9]+$' | sort -un | while read -r n; do
  row=$(pr_row "$n") || { echo "$n	QUERY_FAILED"; continue; }
  # GitHub computes mergeability lazily; the first query often says UNKNOWN.
  case "$row" in *"	OPEN	"*"	UNKNOWN	"*) sleep 5; row=$(pr_row "$n") || true ;; esac
  printf '%s\n' "$row"
done

echo "## open PRs by $(gh_user) not in queue: number headRefName title"
known=$(printf '%s\n' "$resolved" | cut -f4)
gh pr list -R "$repo" --author "$(gh_user)" --state open --limit 200 --json number,headRefName,title --jq '.[]|[.number,.headRefName,.title]|@tsv' |
  while IFS= read -r line; do
    n=${line%%	*}
    printf '%s\n' "$known" | grep -qx "$n" || echo "$line"
  done
