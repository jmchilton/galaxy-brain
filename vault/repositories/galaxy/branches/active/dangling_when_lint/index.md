# dangling_when_lint

Status: `ready`. Base: `dev`.

Warns about disconnected workflow when-inputs and gives them editor ports.

[Polish](polish_debrief.md) · [PR description](pr_description.md) · [Titles](pr_titles.md) · [Tracking history](tracking_history.md)

## Draft PR opened — 2026-10-13

At John’s explicit request, rebased cleanly onto latest dev `63192fd64e46234a7a1aa933e44d8e0930112ccf`. Both patches are identical per range-diff. New head `f985392361a83fdad92f4f5753eeb774ccf080d3`, pushed only to jmchilton with an explicit old-head lease. No conflicts or code edits.

Affected editor lint and workflow-step-store Vitest files: **36/36 pass** across three files. Diff whitespace check passed. Opened [draft #24107](https://github.com/galaxyproject/galaxy/pull/24107) against dev, with the sole selected title **Best practices: flag conditional steps whose input nothing is connected to** and `pr_description.md` verbatim. Verified draft and mergeable. Upstream CI queued/in progress; the request authorized draft creation.

## TICK — 2026-10-14

All 59 prior-head checks settled: 57 successful, two skipped. The human-read item is checked and no independent hold is recorded. Rebased two commits without conflicts onto actual dev c63ffc2ccae4875976677b468dce3ac3e1ba74d8 in an isolated worktree; range-diff confirms both patches identical and diff checks pass. Pushed 0b981e90eea0c4fa4f01c1f744616152f93ed87c only to jmchilton with an exact old-head lease, then marked #24107 ready under standing TICK authorization. Verified new head and non-draft state; fresh CI is pending. Existing development worktree was left untouched.
