# Planemo Maintenance 

@../_shared/VAULT_SYNC.md
@../_shared/SECURITY_REPORTS.md
@../_shared/NOT_VAULT_NOTES.md
@../_shared/AGENT_MARKERS.md

Review notes for `galaxyproject/planemo` pull requests, issues, feature development, plus the rules for keeping the local worktrees in sync with what's worth reviewing.

## Project settings

In the following files:

- PROJECT is `planemo`.
- Base branch: `origin/master`.
- Push remote: the `jmchilton` fork.
- Local gate: `make lint` plus the tests covering the change (`make test` runs them all).
- CI runs on pushes too, so a pushed branch gets fork CI before any PR.

@../_shared/MY_BRANCHES_INDEX.md
@../_shared/REPOSITORY_BRANCHES.md
@../_shared/WORKTREES.md
@../_shared/PROCESS_INITIAL_REVIEW.md
@../_shared/REVIEW_FOCUS.md
@../_shared/MY_ISSUES_INDEX.md
@../_shared/MY_REVIEWS_INDEX.md

The review queue is [MY_REVIEWS.md](../../repositories/planemo/reviews/MY_REVIEWS.md) and the issue index is [MY_ISSUES.md](../../repositories/planemo/issues/MY_ISSUES.md); records sit beside them, including archived history.

The agent running in this directory is also responsible for maintaining and promoting John's branches within [MY_BRANCHES.md](../../repositories/planemo/branches/MY_BRANCHES.md). Branch records and supporting files live in `vault/repositories/planemo/branches/active/<branch_name>/`.

## Automatic Actions

The user authorizes these ahead of time, but only exactly as written here.

- **Rerun unrelated reds.** For each MY_BRANCHES.md entry whose PR or pushed branch has failed CI: unless its branch record has a CI verdict for that head SHA, check CI per [`CHECK_CI.md`](../_shared/CHECK_CI.md) (upstream `galaxyproject/planemo`) and replace the record's CI line with the verdict. Then rerun per that file's "Rerun unrelated reds". Skip `branches_need_decision` and `branches_reference` entries.

## User Interaction

When asked to implement features, fix bugs, tweak PRs, etc. - when the work is "doneish" and you'd like to report the work to John - please make sure it is committed and pushed to a remote. Send John the URL of the branch. Obviously don't commit/push work that contains secrets or security issues - those things need to be reported to John immediately.

When the work requires Galaxy core development (in galaxyproject/galaxy), hand the Galaxy branch off using the process in [`GX_IMPLEMENTATION_HANDOFF.md`](../_shared/GX_IMPLEMENTATION_HANDOFF.md). Prohibitions against branch pushing, etc.. for galaxyproject/galaxy do not apply to galaxyproject/planemo.

## Showing Work

