---
upstream_base_branch: dev
---
# optional_input_gating

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:optional_input_gating?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/optional_input_gating)

Runs workflow steps only when their optional inputs are present.

## Status

Status: `branches_ready_for_final_review`; polished at `8b049f90c33`, revised to `14ff8cf7591` (review comment), 5 commits on `dev` (`a9a68082414`), awaiting John's read-through; parent [dangling_when_lint](../../merged/dangling_when_lint/index.md) merged as #24107.

Not opened as a PR.

Fork CI not yet checked on this head; local vitest (1153), vue-tsc, framework-workflow (6) and gating Playwright tests pass.

## Review

[PR description](pr_description.md) · [Title options](pr_titles.md) · [Labels](pr_tags.md) · [Polish debrief](polish_debrief.md) · [Checklist reviews](subagents/checklist_review_2.md)

## Open decisions

- `expressionGuardsInputPresence`: keep accepting `unknown` or accept only `false-when-null` ([Codex review](codex_review.md)).
- Commit 1 (pick-value test helper cleanup): keep, split out or drop.

## Notes

[Implementation](implementation_debrief.md) · [PR description](pr_description.md) · [Tracking history](tracking_history.md)

Hardening: [test challenges](test_challenges_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md) · [Codex review](codex_review.md) · [thermo-nuclear](thermo_nuclear_review.md) · [baseline refactor](baseline_refactor.md) · [scope evaluation](scope_evaluation.md) · [scope expansion](scope_expansion_debrief.md) · [screenshots](screenshot_debrief.md)
