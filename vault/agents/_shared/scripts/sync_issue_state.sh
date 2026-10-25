#!/bin/bash
# Query GitHub for every tracked issue and PR in an agent's ISSUES.md; print TSV.
# Usage: sync_issue_state.sh <ISSUES.md> <OWNER/REPO> <vault/repositories/PROJECT/issues dir>
# Tracked = issue links in ISSUES.md + numbered dirs outside closed/. Also lists open issues assigned to gh_user not tracked (any status dir, incl. closed/).
set -eu

. "$(dirname "$0")/sync_common.sh"

[ $# -eq 3 ] || { echo "usage: $0 <ISSUES.md> <OWNER/REPO> <issues_dir>" >&2; exit 2; }
index=$1 repo=$2 dir=$3

linked=$(grep -oE "github.com/$repo/issues/[0-9]+" "$index" | grep -oE '[0-9]+$' || true)
dirs=$(find "$dir" -mindepth 2 -maxdepth 2 -type d -not -path "$dir/closed/*" -exec basename {} \; | grep -E '^[0-9]+$' || true)
tracked=$(printf '%s\n%s\n' "$linked" "$dirs" | grep -E '^[0-9]+$' | sort -un)
all_dirs=$(find "$dir" -mindepth 2 -maxdepth 2 -type d -exec basename {} \; | grep -E '^[0-9]+$' || true)

echo "## issues: number state reason closedAt assignees closingPRs"
for n in $tracked; do
  gh issue view "$n" -R "$repo" --json number,state,stateReason,closedAt,assignees,closedByPullRequestsReferences \
    --jq '[.number,.state,.stateReason,.closedAt,([.assignees[].login]|join(",")),([.closedByPullRequestsReferences[]|"\(.number)"]|join(","))]|@tsv' \
    || echo "$n	QUERY_FAILED"
done

echo "## PRs linked in index: number state mergedAt isDraft"
grep -oE "github.com/$repo/pull/[0-9]+" "$index" | grep -oE '[0-9]+$' | sort -un | while read -r p; do
  gh pr view "$p" -R "$repo" --json number,state,mergedAt,isDraft --jq '[.number,.state,.mergedAt,.isDraft]|@tsv' || echo "$p	QUERY_FAILED"
done

echo "## open issues assigned to $(gh_user), not tracked"
known=$(printf '%s\n%s\n' "$tracked" "$all_dirs")
gh issue list -R "$repo" --assignee "$(gh_user)" --state open --json number,title --jq '.[]|[.number,.title]|@tsv' |
  while IFS= read -r line; do
    n=${line%%	*}
    printf '%s\n' "$known" | grep -qx "$n" || echo "$line"
  done
