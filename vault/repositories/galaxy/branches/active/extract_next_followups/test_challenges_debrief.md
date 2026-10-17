# extract_next_followups: test challenges debrief

**Top line:** Done and pushed; the baseline reorder below was done by the coordinator after John approved `rebase -i`. I dropped 8 Python unit tests that API tests already cover (6 in report, 2 in summary) and 1 vitest that only checked CSS class names. The report reconcile now takes resolved content, so its tests need no monkeypatching, and the report stubs are dataclasses. I added shared helpers for the extraction API tests. Every new API test fails on dev at a real assertion, except 3 that pass on dev: they now sit in "Baseline tests" commits at the front (see below). E2E: see "Runs".

Commits, on top of `3c5a53c2c4f`, pushed to `jmchilton/extract_next_followups` (fast-forward, no force):
- `e996a8d7698` Reconcile report labels from resolved content; trim report unit tests
- `11a3a9b3817` Drop closure unit tests the notebook seeding API tests cover
- `9412a34c676` Share extraction test helpers for extract posts, downloads, user tools
- `6f8d250ffaf` Trim extraction card tests: one mount helper, drop class-name styling test
- `ffeda1064c1` fixup! for `6f8d250ffaf` (vue-tsc type fix). Autosquashed in the reorder.

## Baseline reorder (done)

These new tests pass on dev (checked against a `git archive origin/dev` tree with the branch's test files):
- `test_403_for_other_users_private_page`, `test_403_for_published_page_without_history_access`. They come from `3353a3a5c27`, which changes tests only.
- `test_failed_report_rewrite_creates_no_workflow`. It comes from `5b5d0943340`, which adds this API test and drops 3 unit tests.

Plan, already scripted in this session's temporary scratchpad (`seq_editor.py`, `msg_*.txt`, `rollback_api_only.patch`; it may be wiped):
1. Move `3353a3a5c27` to the front and reword it as "Baseline tests: from_page_id extraction refuses inaccessible page or history".
2. Apply the API hunk of `5b5d0943340` as a second commit, "Baseline tests: failed notebook report rewrite creates no workflow". The two edits are identical, so they should merge cleanly when `5b5d0943340` replays.
3. Reword `5b5d0943340` as "Drop call-order report unit tests the rollback API test covers".
4. Autosquash the fixup.
5. Check that `git diff ffeda1064c1 HEAD` is empty, then push with `--force-with-lease`.

The subagent's `git rebase -i` was denied by the permission check; John approved it and the coordinator ran the script. Tree identical to `ffeda1064c1`; new head `f1d8797ae2f` (baselines `74d1d014267`, `d5f6696cc6a`), force-pushed. SHAs above are pre-reorder.

## Per-test decisions

### Python unit tests

`test/unit/workflows/test_extract_report.py`
- **Restructured.** `reconcile_report_labels(index, contents, job_refs, icj_refs, suggest)` is now pure. `reconcile_and_build_report` resolves the referenced content and passes `partial(_suggested, trans)`. `_patch_resolution` (monkeypatching `resolve_content` and `suggested_output_name`) and `_referenced` are gone.
- **Stubs.** The `SimpleNamespace` content, job and ICJ stubs are now the `ContentStub`, `JobStub` and `IcjAssociationStub` dataclasses. `FakeIndex` stays; it is already a small fake.
- **Dropped, because API tests cover them:**
  - `test_history_link_to_page_history_becomes_argless` and `test_history_link_to_other_history_dropped_with_warning`. `test_report_history_link_to_page_history_becomes_argless` asserts both outcomes and the exact warning.
  - `test_unquotable_step_label_dropped_with_warning`. Same path as `test_report_drops_directive_for_unquotable_step_label`.
  - `test_reconcile_keeps_starred_output_without_warning`. `test_report_rewrites_output_and_job_directives` keeps `output="merged"` and asserts `[]` warnings.
  - `test_drop_instance_references_drops_invocation_scoped_directive`. `test_report_drops_invocation_scoped_directive` asserts the same exact warning.
  - `test_rewrite_invalid_markdown_raises_galaxy_exception`. It was on dev, renamed here, and mocked `walk_directives`. The rollback API test takes the same `check_galaxy_markdown` → `MalformedContents` → 400 path with real input.
- **Kept, for edge cases the API layer doesn't reach:**
  - The `\r`, `\x85` and ` ` label cases.
  - The input-label drop.
  - Quoted and spaced id arguments.
  - The embed and cell variants.
  - Indented and CRLF cells.
  - The label-length clamp.
  - Dedupe.
  - The quoted suggested name.
  - The rewriter mechanics.

`test/unit/app/managers/test_workflow_extraction_summary.py`
- **Dropped:** `test_cross_history_producer_with_local_inputs_is_step` and `..._with_missing_input_is_boundary`. `test_copied_history_seeds_original_producer_steps` and `test_copied_tool_output_seeded_as_connected_input` cover the rule end to end, wiring included.
- **Trimmed:** `test_map_output_walks_one_job_per_icj`. I removed the `MockOutputAssoc.reads` counter: it counted `assoc.job` reads, which only tests `creating[:1]`. The test keeps the tool-lookup count, the M2 contract of one tool resolution per map step, plus its behavioural asserts.

`test/unit/app/test_markdown_validate.py` (`remap_galaxy_markdown_cells`): kept. It tests a pure parser helper with no mocks, and the client-parity cases appear nowhere else.

`test/unit/app/managers/test_markdown_export.py`, `test/unit/workflows/test_extract_summary.py`: rename only. No change.

### Vitest

- **`GCard.test.ts`:** dropped "styles the clear-title button as a red icon-only button". It only checked `g-red`, `g-icon-only` and `g-transparent` classes, which is styling. Kept the render-gating test and the emit test.
- **`WorkflowExtractionCard.test.ts`:**
  - One `mountCard` helper replaces the two copies of the mount setup.
  - It uses `mount` rather than `shallowMount`, because the clear button and the output stars render inside GCard. That parent–child interaction is the behaviour under test.
  - The `seed_warning` tests stay on `shallowMount`.
- **`WorkflowExtractionForm.test.ts`, `PageEditorView.test.ts`:** fine as they are. They go through props and emits, with no `wrapper.vm` access added.

### API tests: helpers

- **New mixin helpers in `_ExtractionHelpersMixin`:**
  - `_extract_by_ids_raw` and `_extract_by_ids`: `POST workflows/extract`, used by 8+ call sites across both files, including the dev-era `_assert_extract_rejected` and `_extract_workflow_id_by_ids`.
  - `_extract_from_history_raw`: `POST histories/{id}/extract_workflow`, used twice.
  - `_run_user_tool`: the user-defined-tool run that the branch had copied twice.
- **Existing helpers reused:**
  - Downloads use `workflow_populator.download_workflow`.
  - `_workflow_count` uses `workflow_populator.index()`.
  - Publishing uses `dataset_populator.make_page_public`.
- **`connection_step_id` moved to `galaxy_test.base.workflow_assertions`.** API, pages and Selenium tests now share it. It replaces the module function, the pages `_connected_step_id` body and three inline copies.

### Unit tests: red without the branch

- Not run against dev. Most new unit tests call functions or signatures that dev lacks (`remap_galaxy_markdown_cells`, `_drop_instance_references`, `local_keys=`, `content_label`), so on dev they can only fail on import or with a TypeError.
- `test_map_output_walks_one_job_per_icj`, by reasoning: without the skip for an ICJ that was already walked, each loose element's job calls `tool_for_job`, so `calls` would be `[1, 2, 3, 4]`, not `[1, 2]`.

### API tests: red without the branch

I ran 29 new API tests against dev code.
- **26 fail at their own assertion.** Where the failure is a 400 or 403 status assert in a helper, that status is the behaviour under test: quotes were rejected, and summaries were 403 for non-owner user tools.
- **`test_referenced_output_with_in_history_copy_flags_one_output`** failed with `KeyError` on the new field. It now uses `o.get("referenced_by_report")`, and on dev it fails at an assertion.
- **3 pass on dev.** These are the baseline tests above.

### Selenium

- **`test_notebook_seeds_copied_in_output_as_input`** now uses `connection_step_id`. It was the only change to E2E tests.
- **No new E2E tests needed.** Seeding, the star lock, the report round trip, the toast and the copied-in input already have E2E coverage.
- **`test_extract_button_visible_in_notebook_editor`:** kept. It is redundant, because every notebook test clicks through `notebook_click_extract_workflow`, which waits for that button. But it is on dev, the process doc's drop rules cover unit tests, and an earlier removal was reverted for lack of John's sign-off. **Recommend drop; John decides.**

## Runs

- **Python unit tests** (`test_workflow_extraction_summary`, `test/unit/workflows/`, `test_markdown_validate`, `test_markdown_export`): 277 passed, 1 skipped.
- **mypy** (from `lib/`, on the report module and the two unit files): clean apart from the unrelated `notification.py` error.
- **Linters:** ruff, ruff format, isort and prettier are clean.
- **Vitest** (WorkflowExtraction, Form, GCard, PageEditorView): 120 passed. After the fixup, the card and GCard tests pass: 86. vue-tsc is clean after the fixup.
- **API, `test_workflow_extraction.py`** (whole file, at the new head): 106 passed, 1 skipped.
- **API, `test_pages_history_attached.py -k TestNotebookWorkflowExtractionSummary`:** 19 passed.
- **API against dev code:** 3 passed and 26 failed, as listed above. `two_copies_of_one_input` first timed out on an upload under machine load. On rerun it failed at "Expected 1 steps of type data_input, found 2".
- **E2E (Playwright, own Galaxy on :8097, Vite on :5187), `test_notebook_seeds_copied_in_output_as_input`:** passed, 1 test in 94s. Servers were stopped by PID afterwards.
