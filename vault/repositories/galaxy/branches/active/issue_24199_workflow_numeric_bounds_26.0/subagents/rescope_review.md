# Rescope review debrief

Acted on 2 (unlabeled inputs get generic wording in the inverted-bounds error), 4 (Default Value bounds test now follows `build_module` order — `populate_state` on an empty module, then `recover_state`; also proves an out-of-range default is kept without errors), 5 (helper no longer shadows `min`/`max`). Commit `4b85664fbe9`.

Not acted on:
- 1 Editor saves min > max without warning: needs a `get_errors()` override plus `build_module` merging module errors; editor UX beyond this fix. Follow-up.
- 3 `%s` message for a rejected `0`: deliberately left out of the rescope — it lives in shared `tool_util_models` and changes every tool validator message; separate tiny PR. Sentry logging for the inverted-bounds error skipped: it's bad user data, not an internal failure. Branch record updated.

<details><summary>Full review</summary>

# Rescope review (raw): issue_24199_workflow_numeric_bounds_26.0

Reviewed `git diff a6544be047d...2f7bb5d3251`, focusing on `2f7bb5d3251`. Unit suite `test/unit/workflows/` passes (111 passed, 1 skipped). There are no blocking findings. The new commit is small and coherent, and it does not cause lost defaults or new failures on any path I traced.

## Verified safe (no action)

- **Editor `build_module`, live edits.** The client sends `inputs` with no `tool_state`, so `module_factory.from_dict` recovers an empty state and `get_inputs()` builds the default `text` type. Bounds are therefore `None` while `populate_state(..., check=True)` runs, and the Default field's range validator never runs there. A scratch probe confirmed it: inputs `default=20, min=1, max=5` give `errors == {}`, and the default of 20 is kept. Only the returned `config_form` (built after `recover_state`) carries the bounds. If a caller did send `tool_state`, the probe shows an error entry, but the default value is still kept in state.
- **Load, save and export.** `recover_state` calls `get_inputs()` before the state is populated, so the bounds are absent, and `decode` does not validate anyway. `save_to_step` and `get_export_state` use `_parse_state_into_dict`, and `get_state`/`encode` uses `value_to_basic`, which does not validate either. Persisted string bounds (`"9"`/`"10"`) are converted to ints by `decode`, so the `numeric_bounds_inverted` comparison is numeric, not lexical (probed).
- **Editor load (`_workflow_to_dict_editor`).** It uses `get_config_form`, and with inverted bounds the field is unbounded, so the editor still opens.
- **Raising in `get_runtime_inputs`.** On base, inverted bounds already reached `InRangeValidator` through `parameter_kwds["validators"]` and raised `AssertionError`. Every caller that fails now (run form `_workflow_to_dict_run`, `_workflow_to_dict_preview`, `run_request` parameter validation, scheduler `compute_runtime_state`, refactor `_inject`, `get_stored_workflow_steps`) already failed before. The only change is a 500 becoming a 400 with a clear message. In the scheduler, `invoke()` now takes the `MessageException` branch, so the invocation failure message includes the reason, which is an improvement. `restrict_options` (subworkflow inner parameter steps) wraps its call in `except Exception`, so it is unaffected. `InputParameterModule.get_all_inputs` does not call `get_runtime_inputs`.
- **Type switching.** Bounds are applied only to the case where `param_type == parameter_type`, so float bounds never reach the integer field, and the test covers this.
- **Helper placement.** `workflow_parameter_input_definitions.py` already owns `get_default_parameter` and the type aliases. `split_numeric_bounds` works on the module's `parameter_def` dict, so it fits there, and it removes the duplicated find-and-strip code.

## Findings

### 1. Low/Medium: the editor still accepts and saves `min > max` with no feedback
`lib/galaxy/workflow/modules.py:1308-1310`. The editor quietly drops the bounds from the Default field, and the first error the author sees is a 400 on the run form, on preview, or on any refactor action. REVIEW_FOCUS prefers rejecting never-valid input at edit or validation time.
- Scenario: an author enters min 5 and max 1 and saves without any warning. Users then get "minimum greater than maximum" when they open the run form, and a refactor API call on the workflow (e.g. a label update) also returns 400.
- Suggested fix (small): override `InputParameterModule.get_errors()` to return the same message when bounds are inverted. `_workflow_to_dict_editor` already reports `module.get_errors()`. Live `build_module` only returns `populate_state` errors, so live feedback would also need `errors` merged in `build_module` (`lib/galaxy/webapps/galaxy/api/workflows.py:557`). It is acceptable to defer this to a follow-up. If deferred, record it in the debrief.

### 2. Low: the error message reads `'None'` for unlabeled inputs
`lib/galaxy/workflow/modules.py:1649`. The message uses `self.label`, which is `None` for unlabeled legacy parameter inputs, so it reads "Workflow input 'None' has a minimum ...".
- Suggested fix: fall back to a generic phrase, for example `f"Workflow input '{self.label}'" if self.label else "A workflow parameter input"`.

### 3. Low (process): scope evaluation item D was neither implemented nor recorded as declined
Scope evaluation recommended B, C and D (substituting `0` in the `%s` validator messages). The branch implements B and C only, and neither the commit message nor the branch record says D was dropped. `index.md:13` still says "Editor Default Value bounds ... are out of scope per the issue", which is now stale.
- Suggested fix: update `index.md` and the rescope debrief to record that D was deferred to its own tiny PR (it is in `tool_util_models`, a shared package), or add it.
- The scope evaluation also suggested pairing the typed exception with a log line for Sentry. I disagree: inverted bounds are bad user data, not an internal fault, so a 400 without Sentry is the right outcome. Record this in the debrief so it doesn't look like an oversight.

### 4. Nit: the "follows edited bounds" test doesn't follow the real `build_module` sequence
`test/unit/workflows/test_modules.py:184-200`. The test builds the module from `tool_state` directly. The real flow is `populate_state` against an unbounded module, then `recover_state`, then `get_config_form`. The probe shows the real flow works, but a test mirroring it would pin the more important property: an out-of-range default produces no `populate_state` error and is not dropped. Optional.

### 5. Nit: helper style
`workflow_parameter_input_definitions.py:45`. `min, max = ...` shadows builtins. This is harmless and matches nearby style in `modules.py`, but `lo, hi` reads better. The `numeric_bounds_type` naming matches the file's existing lowercase aliases (`default_source_type`), so leave that as is.

## Known limitation (already in scope_evaluation, not a finding)
Tightening the bounds does not flag an existing out-of-range default. `FormNumber` corrects only on input change, and the server-side `build_module` check runs unbounded (see above). The bad default then fails at run time through `execute` → `FailWorkflowEvaluation`, as before.

</details>
