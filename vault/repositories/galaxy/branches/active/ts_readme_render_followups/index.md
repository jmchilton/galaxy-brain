# Tool Shed historical README rendering

- [PR #24210](https://github.com/galaxyproject/galaxy/pull/24210)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/ts_readme_render_followups)

## Status

`ready` at `c65e1fee192299b340e54f3c9f1373f6a69e944e`, based on `release_26.2`; all 12 patches rebased without conflicts and unchanged in `git range-diff`.

[PR #24210](https://github.com/galaxyproject/galaxy/pull/24210) is open, out of draft, against `release_26.2`, with the chosen title, edited description and labels.

Post-rebase checks pass (108 Tool Shed unit tests, 12 skipped; 6 RepositoryPage tests; whitespace); upstream CI is queued/running.

## Approval

John requested the rebase and PR opening on 2026-10-17. Approved rebased SHA: `c65e1fee192299b340e54f3c9f1373f6a69e944e`. Chosen title: “Keep Tool Shed README text and images on the selected revision”. GitHub added the release prefix `[26.2]` to the published title. The description's human-read checklist is checked. Screenshots are hosted on fork branch `pr-assets-ts_readme_render_followups`.

## Review materials

[Polishing debrief](polish_debrief.md) · [Checklist](polish_checklist.md) · [Strengthening round](polish_strengthening.md) · [Screenshots](screenshot_debrief.md)

## Implementation history

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Image route review](subagents/normal_review_image_route.md) · [Test challenges](test_challenges_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md)

[Scope evaluation](scope_evaluation.md), [thermo-nuclear review](thermo_nuclear_review.md), and [Codex review](codex_review.md) predate the revision-aware image route; the description identifies their historical scope.

#24053 is merged and present in the release base; the former dependency is resolved. Worktree: `~/projects/worktrees/galaxy/branch/ts_readme_render_followups`.
