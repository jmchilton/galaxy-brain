Fix the workflow editor flagging a just-opened, untouched workflow as unsaved, and test running from the editor and cancelling.

Open a workflow in the editor and click Run (or Exit) before it finishes loading, and Galaxy asks you to save changes you never made:

![The editor right after opening a workflow, nothing edited: clicking Run raises "You have unsaved changes. Do you want to save them before proceeding?"](screenshots/editor_unsaved_changes_on_load_before.png)

Loading assigns the workflow's name, annotation, readme, help and logo. The attribute watchers count those assignments as edits, and nothing clears the flag until the versions request returns. For that whole window the Save activity is lit, and Run or Exit opens the modal. The fix settles the flag one tick after the assignments, using the same rule the existing settle uses: ***a workflow whose steps were upgraded on load still counts as changed.*** ***The reset runs in the microtask right after the loaded values land, so no user edit can slip in before it, and edits made afterwards still count.***

***Who sees this: anyone who clicks Run or Exit right after opening a workflow, mostly on a slow or cold load. It surfaced as a cold-start failure of the new E2E test below.***

***Most of the diff is test infrastructure. The only runtime change is 5 lines in `Index.vue`, which is why this targets `release_26.2`: it's a 26.2 bug, the fix isn't API-visible, and the selenium helper fixes come from upstreaming `galaxy_ui_driver` in small release-branch PRs.*** The Vitest in `Index.test.ts` is the regression test for the editor fix; the E2E test waits out the editor's loading shade, so it doesn't depend on the fix.

## The new E2E test

`test_run_from_editor_and_cancel` opens a workflow in the editor, clicks the Run activity, picks a dataset that isn't the run form's preselected default, submits, and cancels the invocation from its page. It checks the invocation used the chosen dataset and ended `cancelled`, and that the page says so.

| Dataset picked in the simplified form | Invocation running | After Cancel |
| --- | --- | --- |
| ![Simplified run form opened from the editor, input1 set to the older "1: Test_Dataset" rather than the preselected newest](screenshots/workflow_run_from_editor_input_selected.png) | ![Invocation page with Cancel in the header, 2 of 2 steps scheduled, 0 of 1 jobs complete](screenshots/workflow_run_from_editor_invocation_running.png) | ![Cancel disabled, red step note and banner: "Invocation scheduling cancelled because user requested cancellation."](screenshots/workflow_run_from_editor_invocation_cancelled.png) |

The selenium helpers the test needs were broken, and one of them hid a bug in existing tests:

| Helper | Before | After |
| --- | --- | --- |
| `workflow_editor_click_run` | Clicked `#workflow-run-button`, which the editor no longer renders 😬 | Clicks the Run activity ✅ |
| `workflow_run_specify_inputs` | Looked inputs up by `step-label`, which only the expanded form renders; timed out on the default simplified form 😬 | Uses `data-label` on the simplified form, `step-label` on the expanded one ✅ |
| `workflow_run_setup_inputs` | Dropped `type: File` test data, so callers selected nothing and passed only because the form preselects the newest dataset 😬 | Returns every data input, so callers really select them; non-data entries raise ✅ |

<details><summary>What the <code>workflow_run_setup_inputs</code> fix shook out</summary>

- `test_execution_with_multiple_integer_parameter` now uploads a newer tabular decoy and asserts the invocation used the setup dataset. On the old helper it fails at that assertion: `run form kept the preselected newest dataset`.
- `test_execution_with_custom_invocation_report` now asserts which dataset each input got, by name. Both inputs are untyped `data` and share one preselected default, so only real selections give two different names. On the old helper it fails with `input_1 got 'my input image'`.
- `WORKFLOW_WITH_IMAGES_IN_REPORT_TEST_DATA` keyed its image as `image_input_1`, but the workflow's input is `image_input` (as the API test that runs the same workflow keys it). It never matched; with the fixed helper, `test_execution_with_images_in_report` would fail loudly instead of passing by accident. The key is corrected in its own commit, which is green before and after the helper fix.
- `workflow_run_specify_inputs` reads `hid` instead of popping it from the caller's dict.
- `invocations.cancel_button`, `workflow_editor.tool_bar.run` and `workflow_editor.canvas_loading` are new `navigation.yml` selectors.

</details>

<details><summary>Why the existing <code>finally</code> reset stays</summary>

`loadEditorData` already ended with `finally { hasChanges = hasStateMessages }` after the versions request. The early reset doesn't replace it: it covers the reload after Save and version switches, which go through the same path. A side effect predates this PR: an edit made while versions are still loading is cleared by that `finally`. Removing it would change reload behavior, so it's left for a separate change. Guarding the attribute watchers on `loadingWorkflow` instead broke 5 existing editor tests that make edits right after mount and expect them to count.

</details>

## Risks

Risks are minimal - the client change only drops a spurious dirty window while a workflow loads, and the rest is test helpers and test data (a two-way door). One existing quirk stays as it was: an edit made while the versions request is still pending is cleared when it returns (see "Why the existing `finally` reset stays" above).

## Context

Part of 🌿[galaxy_ui_driver](https://github.com/jmchilton/galaxy/tree/galaxy_ui_driver), used to upstream its selenium helper fixes in small release-branch PRs; that branch restacks on this one once it merges. Alternative kept on 🌿[workflow_editor_run_cancel_alt_original_scope](https://github.com/jmchilton/galaxy/tree/workflow_editor_run_cancel_alt_original_scope) - just the new test and the `click_run`, `specify_inputs` and Cancel-selector fixes; no `workflow_run_setup_inputs` fix, fixture key, editor fix or load wait.

## Agentic Checks

The checks below reviewed the test and helper commits. The editor fix came after them and had a separate review, summarized last.

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Expanded once to fix <code>workflow_run_setup_inputs</code>; no further change.</summary>

- The first pass recommended folding in the `workflow_run_setup_inputs` bug, the reason the `specify_inputs` breakage went unnoticed. The original scope is kept as an alt branch.
- The second pass recommended no more change. Deferred:
  - A shared "which run form is showing" helper (two call sites, refactor only).
  - Exact `"{hid}: "` matching (`1: ` also matches `11: `). Latent, since every caller uses `@managed_history` with a handful of items, and the dev-targeted tool-form work already reworks `select_set_value`.
  - A canvas wait in `workflow_index_open_with_name`, which another branch rewrites.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No structural regressions; nothing changed.</summary>

- Selectors live in `navigation.yml`, UI steps in `NavigatesGalaxy`, data staging in `RunsWorkflows`; tests only orchestrate and assert.
- The `workflow_run_setup_inputs` rewrite is a net simplification: it walks every data input, raises on unsupported entries instead of silently skipping, and no longer mutates the populator's response.
- Left as is: the cancel test builds its one-input dict directly (keeps the original-scope commits droppable); one detail fetch per input to recover `hid` (the real fix is in shared populators); looser return types.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Strengthened the custom-report test so the expanded form's File selection is pinned too.</summary>

- The decoy and the custom-report name assertions each fail at their own assertion on the old helper and pass with the fix.
- The new E2E test fails on the base inside the helpers it needs (`step-label` timeout, missing `#workflow-run-button`, no Cancel selector), so it's coverage, not a bug reproducer.
- The cancel test's own `_wait_on` is needed: `wait_for_invocation` treats `scheduled` as done and would return before the cancel lands.

</details>

### ✅ Second Frontier Model Review

<details><summary>Codex found nothing in the test and helper commits.</summary>

- Static review of the full diff and callers; runtime coverage comes from the Playwright and Selenium runs.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>None; the <code>workflow_run_setup_inputs</code> cleanup and fix are one change.</summary>

- A behavior-preserving cleanup commit was tried and discarded: for plain-string test data the old `inputs` holds raw upload responses with no `src`, so the uniform loop only works once it walks `label_map`.
- The fixture key commit already sits ahead of the helper fix and is green on both sides of it.

</details>

### ✅ Editor fix review

<details><summary>One-tick reset is the least invasive fix; added the upgraded-on-load test.</summary>

- Every way into the editor's load (first open, subworkflow, version switch, reload after Save) goes through `loadEditorData`, so the one reset covers them all.
- The upgraded-on-load case had no test; one was added, and changing the reset to `false` turns it red.
- `initialLoading` only covers the first mount, and the undo-redo store doesn't own `hasChanges`, so neither fits the fix.
- Left alone: the older `finally` reset (see above).

</details>

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Nothing new. Opening a workflow and clicking Run or Exit before it finishes loading no longer brings up the unsaved-changes modal; a failed versions load still shows the existing error.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. The Vitest holds the versions request pending and clicks Exit: no modal, and the router navigates.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. "Keeps a workflow upgraded on load marked as changed" passes on the base and comes before the fix; the other new assertions fail on the base and ride with their fixes.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? None; only the spurious dirty window goes away. In the editor, a just-loaded workflow is no longer counted as changed while its versions load; one upgraded on load still is.
- [x] Who hits this in practice and what is the evidence? Anyone who clicks Run or Exit right after opening a workflow, mostly on a slow load. It reproduced as a cold-start failure of the new E2E test, and the Vitest fails on the base.
- [x] Were simpler or existing approaches considered? Yes. Gating the attribute watchers while loading broke 5 existing edit-tracking tests, and `initialLoading` only covers the first mount, not the reload after Save or version switches.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- Vitest `client/src/components/Workflow/Editor/Index.test.ts` "while the workflow loads": "does not mark loaded attributes as unsaved changes" fails on the base and passes with the fix; "keeps a workflow upgraded on load marked as changed" passes on both.
- Selenium/Playwright `lib/galaxy_test/selenium/test_workflow_run.py::test_run_from_editor_and_cancel` (new), plus the strengthened `test_execution_with_multiple_integer_parameter` and `test_execution_with_custom_invocation_report`.
- The other `workflow_run_and_submit` callers (`test_execution_with_images_in_report`, `_multiple_inputs`, `_rules`, `_null_optional_select_from_data`) pass with the fixed helper.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
