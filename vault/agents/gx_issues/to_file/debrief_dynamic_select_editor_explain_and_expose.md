# Debrief: dynamic_select_editor_explain_and_expose

Source: `local/dynamic_select_editor_explain_and_expose.md`. Proposal: `proposed_dynamic_select_editor_explain_and_expose.md`. Companion (separate, prepared in parallel): `local/dynamic_select_run_form_dead_end.md`.

Checked against `origin-https/dev` at `36fe2ce8428` (2026-10-14). The draft's code claims came from a 2026-10-02 read.

## Research

- Read on dev: `ToolModule.get_config_form` / `add_dummy_datasets` / `get_all_inputs`, `FormTool.vue`, `FormElement.vue`, `FormText.vue`, `terminals.ts` (`InputParameterTerminal`), `linting.ts`, `Lint.vue`, `RefactorConfirmationModal.vue`, `refactor/execute.py` + `schema.py`, `SelectToolParameter.to_dict`, `is_runtime_context`, `populate_model.py`, bundled `grouping.xml`/`sorter.xml`/`cutWrapper.xml`.
- Git log: #23802 (merged 2026-10-03, after the draft's read), #23992 (merged 2026-10-13), #23123, #18674.
- GitHub: #14304, #14601, #7763, #21099, #21083, #19832, #16491, #16624, #21015, #10989, #24107, #24055, plus searches for editor dynamic select / data_column / extract_input / lint parameter fix. No duplicate found.

## Reproduced (module level, throwaway worktree, since removed)

Test kept at scratchpad `test_dynsel_editor_repro.py` and inlined in the proposal. 3 tests pass on dev:

- Editor config form gives `options: []` (and `textable: true`) for `column_param.col`, `col_names` (use_header_names), `col` with data input *unconnected*, `column_param_list.col` (multiple), `select_from_dataset.select_single`.
- A ↔-toggled `data_column` shows up in `get_all_inputs(connectable_only=True)` as `input_type: "parameter"`, `optional: False`.
- `_apply_extract_input` on it raises `Invalid input type parameter encountered` (single) and `Cannot extract input for multi-input inputs` (multiple).

Code-read only (not run): client chain from lint item to `extract_input` (`getDisconnectedInputs` → `autofix: !terminal.multiple`, `InputParameterTerminal.multiple = false`), and the dry run in `RefactorConfirmationModal` failing the whole batch. No browser or vitest run.

## Changes from the draft

- **New lead finding:** the existing Best Practices "disconnected input" fix is already offered for ↔-toggled parameter inputs and always fails server-side. This turns the "extend `extract_input`" part from new scope into a bug fix.
- "Connected" was the wrong trigger. Options are empty for every dataset-driven select in the editor, connected or not. `add_dummy_datasets` isn't the cause, since the editor has no dataset either way. Opener and code walk reworded.
- Cut example was wrong (`Cut1` `columnList` is `type="text"`); replaced with Group "Group by column".
- "No help" overstated: tool help still renders; only placeholder is blank and nothing explains why. Mentioned the existing ↔ "Add connection to module." toggle.
- Stale claim dropped: "multi-valued column input can't connect yet". After #23802/#23992 multiple integer/text parameters connect. The proposal extends Expose to multi-valued inputs, which needs `multiple` on `AddInputAction` and the guard dropped for parameters.
- `FormRuntimeSelect` dropped in favor of the existing `FormText` placeholder/help path. #24055 `FormSelectOrText` considered and rejected as an alternative (it needs options).
- #14304 treated as a sub-case this issue covers. Added #21083, #10989, #24107, #23992.
- Removed local file references and the unverified "runners hit the dead end" causal claim. The companion is referred to as "to be filed".
- The new Best Practices section is now optional, following the #24107 pattern. The interim `autofix: false` is listed as an alternative / first step.

## Reviewer (one fresh subagent, one round)

Verdict: revised (minor). The premise holds and no duplicate was found.
- Re-ran the issue's exact test code in its own throwaway worktree; 3 pass. Confirmed the editor fields have no error, warning or help text.
- Confirmed every permalink range. Confirmed the client lint chain from code: editor step inputs come from `get_all_inputs(connectable_only=True)` (managers/workflows.py:1578, api/workflows.py:569), and `terminalFactory` builds an `InputParameterTerminal` with `multiple=false`, so `autofix` is true. `fixAllIssues` and the dry run then fail the whole batch, and the UI strings match.
- Edits:
  - ⇆ → ↔, since the icon is `faArrowsAltH`.
  - Fixed the repro-output intro, which mentioned prints the code doesn't have.
  - Proposed Approach now notes that `computedPlaceholder` must stop blanking placeholders outside the run form.
  - Marked #24107 as "(open)".
- Not verified: a browser run; the multi-valued `select` extract case (same guard as the tested `data_column` case).
- The reviewer noted, but did not add, that the lint fix's confirm dialog says "creating an explicit data input step" even for parameters.

## Left over

- The client side of the lint failure isn't covered by a test or screenshot. A vitest on `getDisconnectedInputs` with a parameter step input, or a screenshot, would strengthen the issue.
- Not checked: what happens at run time when a required dataset-driven select is left blank in the editor. The proposal makes no claim about it; that belongs to the companion and `step_parameter_invalid_failure`.
- Minor bug: `_apply_extract_untyped_parameter`'s "unsupported" error string is missing its `f` prefix (`{tool_input_type}` printed literally). Not in the issue.
- Replace "companion issue, to be filed" with the real number before posting.
- Keep the `options_unavailable` field consistent with the companion draft. This issue only uses `reason: data_ref_runtime` + data input name.
- John may want to split off the lint autofix bug as its own small issue. It is concrete and could ship independently (`autofix: false` or typed `extract_input`).

## Post-review alignment (coordinator, 2026-10-14)

The run-form companion ended up restoring the existing `textable` handling and moved `options_unavailable` to its Alternatives. This proposal no longer says the field is shared or defined there; it introduces `options_unavailable` itself and notes the run form could adopt it later.
