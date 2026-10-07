# Debrief: workflow_multiple_parameter_default_not_normalized

Prepared 2026-10-07. Source: `workflow_multiple_parameter_default_not_normalized.md`. Proposal: `proposed_workflow_multiple_parameter_default_not_normalized.md`.

## Research

- Source draft was code-reading only. Drafter reproduced at module level on dev `02a2e659909` (scratch worktree): `[integer]` param through `InputParameterModule.execute` → run request `[5]`; step `default: 5` and subworkflow parent connection → `5`. Recorded invocation input follows same split.
- Drafter found no tool input that breaks on `5` vs `[5]`. Reviewer found real impact via `when` expressions (Galaxy `do_eval` on module output, not server run): `$(inputs.columns.length == 1)` false for `5` → step silently skipped; `$(inputs.columns.includes(5))` throws → invocation fails.
- #21015 has no PR; branch `issue_21015_multiple_text_param` on fork, unmerged → text/float scope pending. #23939 merged; #23802 related. No duplicate.

## Rewrite

- Opener names `when` impact; gxformat2 example with `when` step; results table with expression columns + legend; runnable repro script in details.
- Context cites 🎯 #21015, 🌿 21015 branch, 🔀 #23939, #23802. Proposed Approach: `to_python` normalize in `execute` (same predicate as `run_request`). Alternatives included.
- Red test suggestion: framework `when` test.

## Leftover

- `when` impact shown via `do_eval` only, not a full server/framework run. Red framework test would confirm.
- Scalar on multiple `data_column` untested; issue says "no tool input we checked".
- Swap branch link for PR when 21015 PR opens. Assign John (his branch work).
