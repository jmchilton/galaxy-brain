# container_tool_env

Status: `ready`. Base: `dev`. [PR #23815](https://github.com/galaxyproject/galaxy/pull/23815) (open).

Adds destination job/tool environment scopes and tool-declared container runtime variables.

[Polish](polish_debrief.md) · [PR description](pr_description.md) · [Titles](pr_titles.md) · [Tracking history](tracking_history.md)

## TICK — 2026-10-12

Live regular PR is mergeable at `eb3550da17e1b39edea82eb06ae956163d2df0b7`; all 60 checks have settled without failures. Remains ready from our side. No stale rebase or PR-setting change.

## Requested rebase — 2026-10-13

Rebased PR #23815 onto latest upstream `dev` at `63192fd64e46234a7a1aa933e44d8e0930112ccf`, changing the head from `eb3550da17e1b39edea82eb06ae956163d2df0b7` to `6ee44de1498dd3b203d30db3118a7e80c2d8c72b`. Resolved small additive conflicts in the client job-message union, generated API schema, job imports, and output checker by retaining both upstream's unknown-datatype messages and this branch's runtime-environment warnings. All 16 branch commits retained; range-diff reviewed and `git diff --check` passed.

Focused tests passed: **193 passed**, covering `test_environment.py`, `test_runtime_environment.py`, `test_output_checker.py`, and `test_tool_linters.py` (two existing Docutils deprecation warnings). Pushed only to the `jmchilton` fork with an explicit lease on the previous head. GitHub confirms the new head and `MERGEABLE`; the PR remains open and non-draft, with fresh CI results pending. Status remains `ready` with no known author-side work.
