You'll be asked to sync this agent's `PULL_REQUESTS.md` and review records with GitHub. Rules for the queue and statuses are in [PULL_REQUESTS_INDEX.md](PULL_REQUESTS_INDEX.md) and [REPOSITORY_REVIEWS.md](REPOSITORY_REVIEWS.md); this is the sweep.

## Gather

For each PROJECT this agent covers:

Run, from `vault/agents/_shared/`:

```sh
scripts/sync_review_state.sh ../AGENT_DIR/PULL_REQUESTS.md OWNER/REPO ../../repositories/PROJECT/reviews
```

It covers `PULL_REQUESTS.md` entries plus every directory under `reviews/active/`, and prints:

1. Mismatches: entries with no active record, and active records with no entry.
2. One row per PR: number, state, mergedAt, closedAt, isDraft, mergeable, reviewDecision, `headRefOid`, checks (pass/fail/pending), and SHAs found in the record's `index.md`.

Compare `headRefOid` with the last reviewed commit in `index.md`; the SHA column is a heuristic, so read the record when it's unclear. Use `gh pr view` directly for review bodies or other fields the script omits.

## Reconcile

- **Merged or closed:** remove the entry and archive the record per REPOSITORY_REVIEWS.md (GitHub state and why tracking ended in `index.md`), unless an agent is still working there; then just note it in the report.
- **New commits since the last review:** update the status (e.g. `new commits since <sha>; re-review`). Don't re-review in a sync.
- **Review state changed:** reflect delivered reviews, approvals, draft ↔ ready, and author replies in the status line.
- **Active record with no entry, or entry with no record:** report it; don't add or drop on a guess.
- Keep explicit user decisions in entries as written.

Worktrees: report ones that look removable under [WORKTREES.md](WORKTREES.md); archiving doesn't by itself authorize removal.

Don't post reviews or comments on GitHub as part of a sync.

## Finish

Refresh the snapshot date in `PULL_REQUESTS.md`, write the report, run `make validate` (from the repo root), and commit the touched paths per [VAULT_SYNC.md](VAULT_SYNC.md).

## Report

Write one report per PROJECT to `vault/repositories/PROJECT/reviews/SYNC_REPORT.md`, replacing the previous one. Start with the sync date and agent directory, then list: archived, PRs needing re-review (with new head), status changes, mismatches, and removable worktrees. Summarize it in the reply.
