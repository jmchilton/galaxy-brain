#!/bin/bash
# Query GitHub for every tracked PR in a MY_REVIEWS.md; print TSV.
# Usage: sync_review_state.sh <MY_REVIEWS.md> <OWNER/REPO> <vault/repositories/PROJECT/reviews dir>
# Tracked = PR links in MY_REVIEWS.md + numbered dirs in active/. Prints head SHA beside SHAs found in each record's index.md (heuristic; compare with the last reviewed commit).
set -eu

. "$(dirname "$0")/sync_common.sh"

[ $# -eq 3 ] || { echo "usage: $0 <MY_REVIEWS.md> <OWNER/REPO> <reviews_dir>" >&2; exit 2; }
index=$1 repo=$2 dir=$3

linked=$(grep -oE "github.com/$repo/pull/[0-9]+" "$index" | grep -oE '[0-9]+$' || true)
dirs=$(find "$dir/active" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; 2>/dev/null | grep -E '^[0-9]+$' || true)

echo "## tracked in index only (no active record): $(comm -23 <(printf '%s\n' "$linked" | sort -u) <(printf '%s\n' "$dirs" | sort -u) | tr '\n' ' ')"
echo "## active record with no index entry: $(comm -13 <(printf '%s\n' "$linked" | sort -u) <(printf '%s\n' "$dirs" | sort -u) | tr '\n' ' ')"

me=$(gh_user)
echo "## PRs: number state mergedAt closedAt isDraft mergeable reviewDecision headRefOid checks(pass/fail/pending) my_review my_comment acted index_shas"
echo "## acted = UNPOSTED_BUT_APPROVED when the active record's index.md says unposted but $me approved after the latest round's report was added"
printf '%s\n%s\n' "$linked" "$dirs" | grep -E '^[0-9]+$' | sort -un | while read -r n; do
  json=$(gh pr view "$n" -R "$repo" --json number,state,mergedAt,closedAt,isDraft,mergeable,reviewDecision,headRefOid,statusCheckRollup,reviews,comments) \
    || { echo "$n	QUERY_FAILED"; continue; }
  shas= rec=0
  for f in "$dir"/*/"$n"/index.md; do
    [ -f "$f" ] && shas=$(grep -oE '\b[0-9a-f]{7,40}\b' "$f" | sort -u | head -5 | tr '\n' ',')
  done
  d="$dir/active/$n"
  if grep -qi unposted "$d/index.md" 2>/dev/null; then
    for f in "$d"/review_*_findings.yml "$d"/initial_review_response.md "$d"/draft-review.md "$d"/verified_review.md; do
      [ -f "$f" ] || continue
      t=$(git -C "$d" log --diff-filter=A -1 --format=%ct -- "$(basename "$f")" 2>/dev/null || true)
      [ "${t:-0}" -gt "$rec" ] && rec=$t
    done
  fi
  row=$(jq -r --arg me "$me" --argjson rec "${rec:-0}" '
    ([.reviews[]?|select(.author.login==$me)]|last) as $r
    | ([.comments[]?|select(.author.login==$me)]|last) as $c
    | ([.reviews[]?|select(.author.login==$me and .state=="APPROVED")]|last.submittedAt // null) as $a
    | (if $a then ($a|fromdate) else 0 end) as $acted
    | [.number,.state,.mergedAt,.closedAt,.isDraft,.mergeable,.reviewDecision,.headRefOid,
      ([.statusCheckRollup[]?|(.conclusion // .state // "")]|"\(map(select(.=="SUCCESS" or .=="NEUTRAL" or .=="SKIPPED"))|length)/\(map(select(.=="FAILURE" or .=="ERROR" or .=="TIMED_OUT" or .=="CANCELLED"))|length)/\(map(select(.==""or .=="PENDING"))|length)"),
      (if $r then "\($r.state)@\($r.submittedAt)" else "-" end),
      ($c.createdAt // "-"),
      (if $rec > 0 and $acted > $rec then "UNPOSTED_BUT_APPROVED" else "-" end)]|@tsv' <<<"$json")
  printf '%s\t%s\n' "$row" "$shas"
done
