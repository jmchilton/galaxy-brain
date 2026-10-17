# Scope evaluation (second, post-rescope)

**Recommendation: expand slightly (one item).** Keep everything as implemented, and add an `InputParameterModule.get_errors()` override that returns the inverted-bounds message (scope K1 below). Right now the branch accepts a saved `min > max` silently in the editor and only reports it as a 400 when the run form is opened. With K1, the editor's existing step-error path reports it too: the node error on load, plus the "Some steps in this workflow have validation errors" message on save and import. K1 reuses `split_numeric_bounds` / `numeric_bounds_inverted`, adds about 5 lines and one unit test, and only produces warnings (`has_errors` blocks nothing). Do not take live feedback through `build_module` (K2), the `%s` message fix for `0` (D), or flagging out-of-range defaults (L). Those stay follow-ups. If John prefers not to park the branch for this, keeping the current scope is a defensible alternative, and K1 then becomes the top follow-up.

## Possible Decompositions

The diff is +285/-40 across 9 files. About 85 of those lines are non-test code: `FormNumber.vue`, `modules.py`, `workflow_parameter_input_definitions.py`, `populators.py` and `navigation.yml`. The rest are tests. Hashes below are the current rebased history on `release_26.0` @ `a6544be047d`.

1. **`FormNumber` general fixes (client only).** Contains `19ffa880ed9` (bound helpers), the one-line min-only correction fix inside `eb562100425`, and `41c2102e77a` (clearing an optional bounded field), plus the `FormNumber.test.js` part of the baselines in `ff63ec6ce77`. Every bounded tool input benefits from these, so this piece can land first or on its own.
2. **`download_workflow_raw` populator helper (`953013e8e60`).** A pure test-infra refactor that can land anywhere before piece 4's API tests.
3. **Run-form bounds (server).** The `modules.py` and `test_modules.py` part of `eb562100425`, plus the `test_modules.py` baselines. It needs piece 1, or the min-only and clear-optional bugs reach workflow forms. The Selenium assertion change in `85302c1d457` / `564b40c3839` (server error → client correction) follows from this piece, so it lands here too. This boundary matches alt branch `..._alt_original_scope` (`bfe5dc0e49f`).
4. **Editor Default Value bounds + clear inverted-bounds error.** Contains `90a99a6dab4` and `36c1dbb589a`, plus the API tests in `3b928742223`. Recommended K1 would join this piece.

## Scopes considered

### A. As implemented

The run form gets `min`/`max` from the editor's `in_range` validator, and `FormNumber` fixes min-only correction and clearing optional fields. The editor's Default Value field is bounded, and a saved `min > max` gives a 400 that names the input instead of a 500 (the editor falls back to an unbounded Default field).

| Pros | Cons |
| --- | --- |
| <ul><li>Fixes the issue's reproduction and the related follow-up the issue names (Default Value bounds).</li><li>Fully hardened after the rescope: normal review, test challenges, Codex, thermo-nuclear, refactor baseline, and E2E polish.</li><li>Unit, API and Selenium layers each cover the feature.</li></ul> | <ul><li>A user can still save `min > max` in the editor with no signal. They only learn about it when the run form returns a 400. The branch introduced that 400, so the gap is newly visible.</li><li>An out-of-range Default isn't flagged until the user edits it or runs the workflow.</li></ul> |

### K1. + `get_errors()` for inverted bounds (recommended)

Override `InputParameterModule.get_errors()` to return the same "minimum greater than maximum" message when `numeric_bounds_inverted` holds. Existing callers pick it up: `_workflow_to_dict_editor` (node error on load), `__module_from_dict` → `workflow.has_errors` (the save and import message), and the preview path.

| Pros | Cons |
| --- | --- |
| <ul><li>Closes the inverted-bounds story the rescope started, by telling the user where the bad data was entered and not only where it fails.</li><li>Reuses the existing step-error abstraction (`WorkflowModule.get_errors`, which Tool and Subworkflow modules already override) and this branch's helpers. No new mechanism.</li><li>Small change: about 5 lines plus one unit test (`get_errors()` is None for normal bounds and returns the message for inverted ones).</li><li>`has_errors` only adds warning text (`managers/workflows.py:785`, `api/workflows.py:610`). It blocks nothing.</li><li>Two reviewers raised it (normal N3, rescope #1).</li></ul> | <ul><li>Not live: the warning appears only after a save and reload, or in the save message, because `build_module` does not report module errors (that is K2).</li><li>Existing workflows that already have inverted bounds become flagged with `has_errors` on their next save. Those workflows were already unrunnable (500 before this branch), so flagging them is correct.</li><li>This is a second scope change, so it parks the branch as BLOCKED for John's decision.</li></ul> |

<details><summary>Notes</summary>

`get_errors` runs on modules built from a persisted step (editor dict) and on modules built from a dict during save (`__module_from_dict`), so the state is populated in both cases. The override needs the same `step_state_to_tool_state(self.state.inputs)` → parameter_def path that `get_inputs` uses. It is worth checking whether the editor shows the save response's `errors` list. I didn't check this. If the editor doesn't show it, K1 surfaces only on reload and import.

</details>

### K2. + Live editor feedback via `build_module`

Merge `module.get_errors()` into the `build_module` response, so the warning appears while the user types bounds.

| Pros | Cons |
| --- | --- |
| <ul><li>Gives immediate feedback.</li></ul> | <ul><li>The response's `errors` is a param→message dict from `populate_state`, while `get_errors` returns a string. Merging them changes the shape for every module type.</li><li>`FormDefault`'s `FormDisplay` gets no `errors` prop, so this also needs client work.</li><li>This is an editor UX feature, not a slight generalization.</li></ul> |

Follow-up.

### D. Substitute `0` in validator messages

Change `value_to_show and "%s" in message` to `is not None` in `tool_util_models`.

| Pros | Cons |
| --- | --- |
| <ul><li>One line, and it fixes a real cosmetic bug in this feature's messages.</li></ul> | <ul><li>`tool_util_models` is shared, so the change alters the message for every tool validator.</li><li>This branch makes the bug less visible: `FormNumber` now corrects out-of-range values before submit, so the server message shows up mainly on API and invocation paths.</li></ul> |

Known follow-up, a separate tiny PR. No new reason to pull it in.

### L. Flag a Default Value outside the bounds

Also return an error from `get_errors()` when the saved default falls outside `[min, max]`.

| Pros | Cons |
| --- | --- |
| <ul><li>Catches the other "bad saved state" case the rescope left: an out-of-range default is kept with no error.</li></ul> | <ul><li>Existing saved workflows that run today with an optional input, or with a default that users always override, would start getting flagged. That changes behavior on existing data.</li><li>It interacts with optional/default semantics that this branch doesn't touch.</li></ul> |

Follow-up, if anyone asks for it.

### C0. Contract to original scope (alt `bfe5dc0e49f`)

Run-form bounds and the `FormNumber` fixes only.

| Pros | Cons |
| --- | --- |
| <ul><li>Smaller, and already fully hardened as an alt.</li></ul> | <ul><li>Drops the Default Value bounds that the issue itself names as the related follow-up.</li><li>Keeps the 500 for inverted bounds on lines the branch touches.</li><li>The Selenium assertion change (server error → client correction) belongs to this scope too, so contracting doesn't avoid that decision.</li></ul> |

Reject.

### Carried-over follow-ups (no scope change)

- **E / F / R1:** preserve full `in_range` semantics, and carry bounds as bounds instead of round-tripping them through a validator. Both change the persisted and export contract (`get_export_state`), which is too much for 26.0.
- **G:** derive `min`/`max` for all tool parameters. Reject: tool XML already sets them.
- **H:** range help text. Skip: the slider and the warning already show the range.
- **J:** multiple integer is dev-only. The repro passes on dev after a forward-merge. When forward-merging, re-check the slider layout next to a row's remove button.
- **R3:** decompose `get_runtime_inputs` into per-concern kwds builders. **R6:** split `InputParameterModule` out of `modules.py`. Both are pre-existing structure, so they're follow-ups.
