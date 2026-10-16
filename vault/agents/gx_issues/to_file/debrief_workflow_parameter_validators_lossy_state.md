# Debrief: workflow parameter validators lossy state

Source: `to_file/workflow_parameter_validators_lossy_state.md` (workflow_libs draft, 2026-10-15). Proposal: `to_file/proposed_workflow_parameter_validators_lossy_state.md`.

## Research

- Re-ran the source probe on fresh `dev` `5ff1e46b8c3` (detached worktree, main clone's venv). All five source rows reproduced.
- **Reframed the headline.** The source said runtime ignores *stored* validators. But `InputParameterModule.save_to_step` writes `_parse_state_into_dict()`, and workflow import (`managers/workflows.py` `__module_from_dict`) calls `from_dict` then `save_to_step`. So the lossy rewrite happens at **import**. A negated validator never reaches the DB. Re-probed via `from_dict` + `save_to_step`: saved, exported and runtime all show the rewritten list.
- Consequence for approach: source Approach 1 ("build runtime from stored validators") is not enough alone. Import has to stop rewriting first.
- `get_runtime_inputs` already parses validators with `parse_dict_validators` (the reviewer found this). The runtime side supports negate, repeated ranges and messages; only its input is lossy. That is the strongest reuse argument.
- `InRangeParameterValidatorModel` (tool_util_models) has no `min <= max` check. Only the legacy `InRangeValidator` asserts. The proposal puts the check in the model, so tools and workflows share it.
- `min > max`: imports and is stored unchanged; asserts when the runtime param is built. Shown at module level only; how it surfaces in the run form or an invocation is unverified (no server run).
- gxformat2#265 merged 2026-10-15 but is unreleased (PyPI and Galaxy pin are both 0.27.0). The Format2 `negate` path is therefore prospective; the issue leads with native `.ga` and API workflows.
- Dropped citations: galaxy#20980 (unrelated, no validator changes). Branch `invocation_parameter_expected_failure` exists but isn't relevant enough to cite.
- Duplicate search: none. The closest is #20114 (subworkflow validators propagated to the parent), a different problem.
- Red repro: 5 pytest cases, all failing on dev, included in the issue.

## Rewrite

- New opener: import rewrites validators. The table comes first (input, saved/exported, value, `.ga` says, Galaxy does), with a legend.
- `min > max` has its own paragraph (different root cause: nothing validates at save).
- Call tree in details covers the import, runtime/export and editor legs.
- Proposed: keep the declared validators. Validate them at import via the existing models and `parse_dict_validators`, store them unchanged, use them at runtime and export, and carry form-unrepresentable ones through editor re-save. The alternative is to reject anything the editor can't represent, with gxformat2 dropping `negate`.

## Review round (subagent, one round)

No pushback. Verified claims, the repro (5 fail), the import path and gxformat2 release status. Edits:
- Opener wording: "every range but the last".
- Only the negated validators are "inverted".
- Named `InRangeValidator`.
- Removed "converted workflows" (0.27.0 emits none of these).
- Added the editor leg of the call tree and the `parse_dict_validators` note.
- Editor bullet: names the mechanism (hidden form field merged in `_parse_state_into_dict`) and calls it the largest piece.
- Fully qualified the gxformat2 refs.
- Nested Alternatives in details.

Left over:
- "Use the stored list" implies the module must stash the raw validators past `recover_state`.
- The "Related: run form bounds" bullet relies on the unfiled sibling draft `proposed_workflow_parameter_range_not_shown_in_run_form.md`.

## Decisions for John

- **Honor vs. reject `negate`.** The proposal honors it. If you'd rather reject it, swap Proposed and Alternative, and gxformat2 should drop `negate` from `WorkflowTextValidator` before releasing #265. **This decision blocks the gxformat2 release.**
- **Design with the run-form bounds draft.** Both fixes touch `get_runtime_inputs` and the same stored list. Consider filing them together, or folding the bounds draft in as a follow-up.
- **Assignment.** The issue came out of your gxformat2 work, so assign yourself and add it to `ISSUES.md` if posted.
