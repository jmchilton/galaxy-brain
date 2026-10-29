You'll be asked to sync this agent's `MY_ISSUES.md` indexes and issue records with GitHub. Rules for the index and statuses are in [MY_ISSUES_INDEX.md](MY_ISSUES_INDEX.md) and [REPOSITORY_ISSUES.md](REPOSITORY_ISSUES.md); this is the sweep.

## Gather

For each PROJECT this agent covers:

Run, from `vault/agents/_shared/`:

```sh
scripts/sync_issue_state.sh ../../repositories/PROJECT/issues/MY_ISSUES.md OWNER/REPO ../../repositories/PROJECT/issues
```

It prints three TSV sections:

1. Tracked issues (every issue link in `MY_ISSUES.md`, untriaged included, plus numbered directories outside `closed/`): number, state, reason, closedAt, assignees, closing PRs.
2. PRs linked in `MY_ISSUES.md`: number, state, mergedAt, isDraft. Check any closing PR from section 1 that isn't listed here with `gh pr view`.
3. Open issues assigned to the tracked user (`gh_user` in `scripts/sync_common.sh`, jmchilton unless `GB_GH_USER` is set) that aren't tracked in any status directory (`delegated/` and `closed/` included).

Use `gh issue view` directly only for labels or other fields the script omits.

## Reconcile

- **Closed on GitHub:** move the directory to `closed/`, add a line near the top of `index.md` (how it closed, PR and merge commit if any, date), and remove the `MY_ISSUES.md` line. Leave its branches and worktrees to [PROCESS_SYNC_BRANCH_STATE.md](PROCESS_SYNC_BRANCH_STATE.md).
- **Linked PR merged, issue still open:** leave it open; move to `needs_decision` with `decide: close?` unless the PR clearly doesn't resolve it.
- **Status drift:** if a line's section and its directory disagree, or the facts changed (a PR opened → `wip`, a blocker merged → `queued`), move both together.
- **Assignment changed:** update `(assigned)` / `(unassigned)` markers against the header default.
- **New assigned issues:** add as `untriaged` lines. Don't triage them in a sync unless asked.
- `wip` lines name the branch or PR only; CI and review state belong in `MY_BRANCHES.md`.

Don't post comments, edit labels or close issues on GitHub as part of a sync, even on greenlisted repositories.

## Finish

Refresh the snapshot date in each `MY_ISSUES.md`, write the report, run `make validate` (from the repo root), and commit the touched paths per [VAULT_SYNC.md](VAULT_SYNC.md).

## Report

Write one report per PROJECT to `vault/repositories/PROJECT/issues/SYNC_REPORT.md`, replacing the previous one. Start with the sync date and agent directory, then list: closed out, moved (from → to, why), new untriaged, and anything needing John's decision. Summarize it in the reply.
