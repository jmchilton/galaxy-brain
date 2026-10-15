# invocation_graph_color_swatch

Status: `branches_implemented_needs_ci`. Base: `dev` (`c63ffc2ccae`). Fork: `jmchilton/invocation_graph_color_swatch` @ `89f18bbc2b9`. No PR.

Invocation graph shows a color parameter input as bold hex text instead of the color swatch the run-form graph shows. PR-first fix for [proposed issue](../../../../../agents/gx_issues/internally_managed/proposed_invocation_graph_color_param_swatch_dead.md) ([research debrief](../../../../../agents/gx_issues/internally_managed/debrief_invocation_graph_color_param_swatch_dead.md)); no issue filed.

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Test challenges](test_challenges_debrief.md) · [Codex](codex_review.md) · [Scope evaluation](scope_evaluation.md) · [Screenshots](screenshot_debrief.md)

## Decisions

- Decide by the step's declared parameter type (`outputs[0].type === "color"`), not by value shape — per the proposed issue's preferred approach.
- No E2E on this branch; invocation-graph E2E belongs to sibling `proposed_invocation_graph_no_e2e_coverage.md`.
- Scope kept as implemented; `directory_uri` parity and `nodeText` HTML refactor are follow-ups.

## History

- 2026-10-14: handed off BLOCKED (screenshots; ports held by another session). 2026-10-15: John asked for retry; screenshots captured, real-server payload check passed → READY.
