# Debrief: workflow_parameter_range_not_shown_in_run_form

Prepared 2026-10-11 from `workflow_parameter_range_not_shown_in_run_form.md`. Proposal: `proposed_workflow_parameter_range_not_shown_in_run_form.md`.

## Research

- Verified the live Galaxy `dev` SHA through GitHub: `c8708636c2f29a233dcce4b9c1fa75f2c5aea24f`. Used an archived snapshot in `/private/tmp/gx-issues-range-20261011`, preserving the existing Galaxy checkout and worktrees.
- Ran `test/unit/workflows/test_parameter_range_repro.py` with the existing Galaxy Python environment. Integer `7`, float `7.0`, and multiple-integer `[1, 7]` all trigger their range validator, but `parameter.to_dict(trans)` emits `min: null, max: null`. All three expected-bounds assertions fail. Output is in the scratch snapshot's `repro-results.txt`.
- Initial collection needed the tracked navigation symlink's target added to the snapshot. An overly specific integer-message matcher was corrected for float formatting. The final run reaches the intended bounds assertion in every case. The mock application logs a missing UCSC sample-builds file; sandboxed mirakuru process cleanup also logs a permission error after pytest. Neither prevents the three reproductions.
- Confirmed the production run-form serialization uses these same `get_runtime_inputs` and `to_dict` calls in `WorkflowsManager._workflow_to_dict_run`.
- Read `FormNumber.vue`: a slider needs two numeric bounds with `max > min`; warnings and correction on field change support either bound independently. Corrected the source draft's implication that warnings require both bounds or happen while typing.
- Current dev uses `FormNumberList.vue` for multiple integers, not the source draft's branch-only `FormValueList.vue`. Its rows already forward the bounds.
- Confirmed the separate editor Default Value field is built without range attributes. Kept it as a related follow-up rather than treating the runtime reproduction as proof of its UI behavior.
- Confirmed the origin commit `d8b980b3e6b` belongs to merged PR [#19092](https://github.com/galaxyproject/galaxy/pull/19092), which persisted editor bounds as validators without adding runtime field bounds.
- Searched Galaxy issues and PRs for workflow parameter range, workflow min max, `in_range` + workflow, and slider + workflow; also issues for minimum + workflow and range + parameter, and PRs for range + parameter. No relevant duplicate found.

## Rewrite

- Led with the missing range feedback and a table of the three reproduced cases; included a runnable failing test.
- Clearly separated reproduced server/serialization behavior from UI consequences read from code. No browser screenshot or end-to-end invocation was produced.
- Added immutable source links and Context referencing #19092, #21015 and its branch, #23802, and #23939.
- Proposed exposing compatible bounds while keeping server validation, with alternatives for client-side validator interpretation and static range help.
- Added handling caveats for single bounds, zero/negative/float bounds, negated or exclusive validators, multiple validators, and constructors adding another range validator.
- Left the source draft unchanged and kept the issue in `to_file/` pending John's posting decision, per `PREPARE_TO_FILE.md`.

## Review round

- One fresh-subagent review completed. The reviewer reran all three reproduction cases and confirmed that each fails only the serialized-bounds assertion after server validation rejects the value.
- Confirmed #19092, #23802, #23939, and #21015. No wrong premise or duplicate was identified.
- Revised the lead and UI reproduction wording to clearly distinguish module-level evidence from UI consequences inferred from code; added the test command and clarified the #21015 context.
- Added a one-sided correction caveat: scalar `FormElement` passes an absent bound as null, and `FormNumber.onInputChange` chooses the corrected value using `value > this.max`. For `min=5`, `max=null`, and `value=3`, that expression chooses null instead of 5. `FormNumberList` converts null bounds to undefined, avoiding this particular case. Inspected in code only; the implementation should test it.
- Recommendation: post the revised proposal. The core runtime-field bug is reproduced, and the limitations are explicit.

## Remaining limitations and handoff

- No browser or end-to-end invocation reproduction. The runtime field's missing bounds are directly reproduced; slider and warning consequences follow from the component code.
- The editor Default Value field and one-sided correction caveat were inspected in code only. Advanced validator handling and constructor-added validation require implementation tests.
- No issue was posted or assigned. `PREPARE_TO_FILE.md` requires an explicit posting request; the source, proposal, and debrief remain in `to_file/` for that decision.
- `make validate` passed: 122 files, zero errors, 15 existing advisory warnings. No vault frontmatter or generated index/dashboard changed.
