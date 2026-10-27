---
upstream_base_branch: dev
---
# optional_input_gating

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:optional_input_gating?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/optional_input_gating)

Runs workflow steps only when their optional inputs are present.

## Status

Status: `branches_implemented`; hardening paused at scope evaluation (recommends modest expansion) at `0bd89181eb3`, 4 commits on `dev` (`a9a68082414`); parent [dangling_when_lint](../../merged/dangling_when_lint/index.md) merged as #24107.

Not opened as a PR.

Fork CI not yet checked on this head; local vitest (1140), vue-tsc and framework-workflow tests pass.

## Open decisions

- Scope: generalize orphaned-connection cleanup on any `when` change, or keep as implemented ([scope evaluation](scope_evaluation.md)).
- `expressionGuardsInputPresence`: keep accepting `unknown` or accept only `false-when-null` ([Codex review](codex_review.md)).

## Notes

[Implementation](implementation_debrief.md) · [PR description](pr_description.md) · [Tracking history](tracking_history.md)

Hardening: [test challenges](test_challenges_debrief.md) · [E2E polish](polish_e2e_tests_debrief.md) · [Codex review](codex_review.md) · [thermo-nuclear](thermo_nuclear_review.md) · [baseline refactor](baseline_refactor.md) · [scope evaluation](scope_evaluation.md)
