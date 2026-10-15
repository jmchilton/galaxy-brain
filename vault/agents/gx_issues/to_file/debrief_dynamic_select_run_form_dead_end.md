# Debrief: dynamic_select_run_form_dead_end

Prepared 2026-10-14 from `internally_managed/dynamic_select_run_form_dead_end.md`. Proposal: `proposed_dynamic_select_run_form_dead_end.md`. Companion drafts (separate issues): `dynamic_select_editor_explain_and_expose` (now `proposed_dynamic_select_editor_explain_and_expose.md`) and `internally_managed/step_parameter_invalid_failure.md`. The proposal links them only in an HTML comment, to be filled in once they are filed.

## Research

- Read `dev` at `origin-https/dev` [`36fe2ce8428`] read-only. Ran code in a throwaway worktree (`/private/tmp/claude-503/gx-dynsel-runform`, now removed) with the existing Galaxy `.venv` and pnpm client deps under node 22.20.0.
- **Server reproduction (passes, documents the contract):** a `data_column` whose `data_ref` HDA is `new`/`queued`/`running` serializes `options: []` and `textable: true`, and `from_json("2")` accepts the typed column. The `ok` control with 3 columns gives options 1–3 and `textable: false`.
- **Client reproduction (fails on dev):** `FormElement` mounted with `type: data_column`, `options: []`, `textable: true` renders only "No options available." and no `<input>`. That holds with and without a saved value. The control `is_workflow: true` renders a text field.
- **Probe fix:** OR-ing `attrs.textable && !attrs.options?.length` into `FormElement`'s `FormText` condition turns the client reproduction green, and `FormElement.test.js` still passes.
- **Regression history:**
  - 🎯 #3758 asked to queue tools on datasets that aren't ready yet. 🔀 #5702 fixed it with `TextSelect`, which shows a text field when `textable` is set and there are no options.
  - 🔀 #5680 prefilled columns 1–999 instead. That was reverted the next day in `db47c876ee6`.
  - 🔀 #6251 (for 🎯 #6249) introduced `is_runtime_context`.
  - The Vue select migration dropped the `textable` branch. The reviewer corrected my attribution, and I confirmed the correction: the fallback was lost in 🔀 #16010 (`108a91438ad`, in `v23.1`, not in `v23.0.6`), not in #16578, which only deleted the already-dead legacy code in 23.2.
- **Other code checks:**
  - Nothing in `client/src` reads `textable`. `WorkflowRunDefaultStep.vue` only copies it on refetch.
  - The `populate_model.py` "hack" comment is still there.
  - `_workflow_to_dict_run` uses `USE_HISTORY` (`1`, truthy), so every select in the initial run payload has `textable: true`. Only the `/api/tools/{id}/build` refetch reflects the real dataset state. So the fix must gate on `textable && no options`.
- **The `Galaxy.currHistoryPanel` guard:** resolved. It was removed in `a3edd34dbb8` (2025-10-10). The run form now refetches when `historyItemsStore.lastUpdateTime` changes, so the options fill in once the dataset is `ok`. The draft's "dead end" is therefore "can't queue ahead of the data", not permanent.
- **Dataset states:** the run-form picker offers `new`/`upload`/`queued`/`running` datasets (`VALID_INPUT_DATASET_STATES`). The `data_ref` data param is `refresh_on_change`.
- **Duplicate search:** searched for "No options available", textable, `data_column` + workflow / implicit conversion / queued / not ready, dynamic options, `from_dataset`. Viewed #3758, #5680, #5702, #6249, #6251, #16578, #16010, #21083, #21099, #21100, #20136, #18990, #23077, #14304 and #23802. No open duplicate:
  - #21100 was closed as won't-fix for the expanded run form.
  - #20136 was fixed via the `param_value` filter (#20144).
  - #21083, #21099 and #14304 are about the editor.

## Changes from the draft

- Reframed as a regression of #3758 affecting both the tool form and the workflow run form, not a run-form-only gap. Added a manual reproduction with the Group tool.
- Dropped "permanent dead end": the options do fill in once the dataset is `ok`.
- Corrected the `textable` premise. It's true for every select in the initial run payload and only discriminates on refetch. The old rule was `textable && no options`.
- Moved the "upstream tool step → bare text box" row to a control row. It works, and the explanation belongs in the editor companion issue.
- The `model.js` heuristic and `add_dummy_datasets` details were not needed for the argument, so they were dropped.
- Implicit conversion is mentioned only as read from code. The unit datatypes registry has no csv→tabular converter, so that case wasn't reproduced.
- The draft proposed a new `options_unavailable{reason}` field. The proposal instead restores client handling of the existing `textable` contract, which reuses what's already there. The reason field and the 1–999 prefill moved to Alternatives.

## Review round

One fresh-subagent review was run.

- **Pushback 1 (fixed):** the regression came from #16010 in 23.1, not #16578 in 23.2. I verified this independently.
- **Pushback 2 (fixed):** the "saved value" row was wrong. **Edit** sets `default_value` (null), clearing the saved column, and only **Undo** restores it. The reviewer added that case to the client reproduction, where it fails on dev.
- **Other edits:**
  - `is_runtime_context` looks at every dataset in the tool's state.
  - The typed column isn't checked against the data, so "checked later" was removed.
  - The manual steps now set the datatype to tabular explicitly.
  - Added a reproduced-vs-code-read paragraph.
  - Noted the 23.0 side effects that come back with the old rule.
  - Removed `drill_down` from the list of select-like types.
- Reviewer reran both reproductions. The server test passes. In the client test (4 cases), the 3 not-ready cases fail on dev and pass with the probe; the control passes.
- The reviewer found no duplicate and recommended posting as revised.

## Left over

- Nothing was run in a browser. The tool-form path, the "Please provide a value…" block and the 23.0 behaviour are read from code.
- The implicit-conversion case is code-read only.
- The HTML-comment placeholder for the companion issues needs real links (or deletion) when posting.
- Nothing posted, committed or pushed. The source, proposal and debrief stay in `to_file/` pending John's decision.
