# Thermo-nuclear review — workflow_editor_run_cancel (re-harden, scope B)

Reviewed `65132d40dac..b1b0fd4a380` (6 commits, about 100 lines) fresh against `thermo-nuclear-code-quality-review.md`, scaled to a small test-infra branch for a release. The focus was the scope-B delta that the first draft never saw: the `workflow_run_setup_inputs` rewrite, `pop` -> `["hid"]`, the fixture key, and the two strengthened tests. **No structural regressions and no changes made.** All SHAs are unchanged, including `bd15a4f667f` (fixture key, still pending John's OK). No tests were run because no code changed.

## Found

1. `test_run_from_editor_and_cancel` builds `{"input1": {"hid": ...}}` by hand instead of using the canonical `workflow_run_setup_inputs`, which this branch now fixes.
2. Recovering `hid` takes one detail fetch per input, because `ds_entry` drops the `hid` that the upload responses already carry.
3. The form-mode check ("wait for `run_workflow` visible, then branch on `expanded_form.is_absent`") is repeated in `workflow_run_specify_inputs` and `workflow_run_ensure_expanded`.
4. The two strengthened tests answer "which dataset did this input get" in two ways: positionally (`inputs["0"]`) and through a label map.
5. The `workflow_run_setup_inputs` return type, `tuple[str, dict[str, Any]]`, is looser than the `dict[str, dict[str, Any]]` it builds. The `workflow_run_specify_inputs` parameter has the same looseness.
6. `test_workflow_run.py` grows from 1136 to 1207 lines.

## Changed

Nothing.

## Not changed, and why

1. **The cancel test bypasses `workflow_run_setup_inputs`.** This is the real rule-6 finding, but I left it.
   - The test commit `71091e1b81f` comes before the helper fix. A setup_inputs version would select nothing at that commit, so the rewrite would have to fold into the head and edit the test after the fact.
   - The direct dict keeps the original-scope commits standalone. If John rejects scope B (`bd15a4f667f` / `b1b0fd4a380`), the test still stands; see `alts/original_scope.md`.
   - The canonical path is already pinned red-to-green by the decoy in `test_execution_with_multiple_integer_parameter`. The YAML version would also be longer than the two-line setup.
2. **Per-input detail fetch.** The real fix is to keep `hid` in `load_data_dict`/`ds_entry`. Those are shared populators used by API tests, and `ds_entry`'s output goes into invoke payloads. That is out of proportion for a release branch. A single `get_history_contents` call would need `(history_content_type, id)` keys, because hda and hdca encoded ids can collide, so it doesn't simplify anything. The loop is short and its shape is explicit.
3. **Form-mode check duplicated.** Deferred as scope C. `navigates_galaxy.py` is shared with sibling branches, and the common rules ask to keep this branch independently mergeable.
4. **Positional vs label lookup.** The integer-parameter test has one input, so `"0"` is unambiguous. The custom-report test has two inputs and needs labels. The polish pass already declined a helper for this. It's a nit.
5. **Return and parameter types.** Tightening them is a plain improvement, but it would rewrite SHAs (including `bd15a4f667f` for the specify_inputs side) and force E2E reruns for a change with no runtime effect. Better done in the scope-C helper cleanup.
6. **File size.** `test_workflow_run.py` was already over 1k lines before the branch, and no file crosses 1k for the first time. `framework.py` grows by 1 line and `navigates_galaxy.py` by 7.

Also kept on purpose: `assert selected_id != decoy["id"]` before `== inputs["input"]["id"]`. It is logically redundant, but it carries the diagnostic message, and dropping an assertion would need John's OK.

<details>
<summary>Full review</summary>

**Scope:** `navigation.yml` (+2 selectors), `navigates_galaxy.py` (`workflow_editor_click_run` now uses the Run activity component, and `workflow_run_specify_inputs` picks the simplified or expanded selector and no longer mutates its argument), `framework.py` (`workflow_run_setup_inputs` built from `label_map`), `workflow_fixtures.py` (one key), `test_workflow_run.py` (+1 test, +2 strengthened tests).

**1. Structural regressions:** none. Selectors live in `navigation.yml`, UI steps in `NavigatesGalaxy`, test-data staging in `RunsWorkflows`, and the tests only orchestrate and assert. Nothing changes at runtime.

**2. Code judo:**
- *`workflow_run_setup_inputs`:* the rewrite is a net simplification. The old loop walked `inputs`, which omitted `type: File`/`Directory`, and filtered with a three-part walrus guard, silently skipping anything else. The new loop walks `label_map`, which contains every data input. It raises on non-data entries instead of skipping them, and returns a fresh minimal `{src, id, hid}` dict instead of mutating the populator's response. The only deeper move is keeping `hid` in `ds_entry` (see item 2 above), which belongs to a shared layer.
- *`workflow_run_specify_inputs`:* a selector picked once before the loop, with a comment explaining why a single `data-label` selector is ambiguous in the expanded form. `["hid"]` instead of `pop` removes a hidden side effect. Minimal.
- *Cancel test:* a direct `_wait_on` barrier on the asserted state. The populator's `wait_for_invocation` counts `scheduled` as ok, so it can't stand in.

**3. Spaghetti / branching:** one commented conditional expression in `specify_inputs`, at the natural decision point. In `setup_inputs`, the hda/hdca/else chain maps one-to-one onto `ds_entry`'s two outputs plus an explicit error for unsupported entries. There are no flags or modes.

**4. Boundary / type:** `inputs: dict[str, dict[str, Any]]` is now annotated. The function and parameter signatures are still `dict[str, Any]` (item 5). No casts. `input_value["id"]` replaces the old `.get("id")`, which could pass `None` through.

**5. File size:** no threshold crossing caused by this branch.

**6. Modularity:** `workflow_run_specify_inputs` has 2 callers and `workflow_run_setup_inputs` has 2 (`workflow_run_and_submit` and the integer-parameter test). Both stay in their canonical homes. The fixture key fix lines the selenium fixture up with the workflow's only input, `image_input`, and with the API sibling test.

**7. Legibility:** comments explain the non-obvious points: the newest-dataset preselection trap (three places, each tied to its own test), `label_map` vs `inputs`, `step-label` vs `data-label`, the async cancel, and the 3s poll. Docstrings are one line.

**Verdict:** approve with no changes. The remaining items are deferred deliberately (scope C, shared populators) or are nits whose fix would cost SHA churn and E2E reruns.

</details>
