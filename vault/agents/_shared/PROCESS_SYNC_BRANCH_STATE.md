You'll be asked to sync this agent's `MY_BRANCHES.md` queues and branch records with GitHub. Rules for the queue and sections are in [MY_BRANCHES_INDEX.md](MY_BRANCHES_INDEX.md) and [REPOSITORY_BRANCHES.md](REPOSITORY_BRANCHES.md); this is the sweep.

## Gather

For each PROJECT this agent covers:

Run, from `vault/agents/_shared/`:

```sh
scripts/sync_branch_state.sh ../../repositories/PROJECT/branches/MY_BRANCHES.md OWNER/REPO ../../repositories/PROJECT/branches
```

It prints:

1. The queue: section, branch, record directory and PR (from the entry, the record's `pr:`, or the tracked user's newest PR from that head branch).
2. Mismatches: entries with no record link or no active record, and active records with no entry.
3. One row per PR: number, state, mergedAt, closedAt, isDraft, mergeable, reviewDecision, `headRefOid`, checks (pass/fail/pending), headRefName.
4. Open PRs by the tracked user that aren't in the queue.

Use `gh pr view` directly for review bodies or other fields the script omits.

## Reconcile

- **Merged:** per "Merged PRs" in MY_BRANCHES_INDEX.md.
- **Closed unmerged:** per "Closed PRs" there. Entries already in `branches_need_decision` or `branches_reference` stay put.
- **Open:** move the entry to the PR section live state calls for, including entries in `branches_*` sections whose PR has opened. Add `pr:` to the record if missing.
- **Untracked open PRs and mismatches:** report them; don't add or drop on a guess.
- Keep explicit user decisions in entries as written.

Don't rerun CI, undraft, comment or otherwise write to GitHub as part of a sync; Automatic Actions in AGENTS.md cover those.

## Finish

Refresh the snapshot date in each `MY_BRANCHES.md`, write the report, run `make validate` (from the repo root), and commit the touched paths per [VAULT_SYNC.md](VAULT_SYNC.md).

## Report

Write one report per PROJECT to `vault/repositories/PROJECT/branches/SYNC_REPORT.md`, replacing the previous one. Start with the sync date and agent directory, then list: merged, closed, moved (from → to, why), untracked open PRs, mismatches, and worktrees kept or removed. Summarize it in the reply.
