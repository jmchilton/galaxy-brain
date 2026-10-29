Run via Claude Opus 5.5 at high effort.

# Test challenges: extraction_hid_copies_pdf_sections_26.1

## Changes made

1. **Baseline commit split out.** `test_hid_extract_connects_implicitly_converted_input` passes on bare `release_26.1`. The base keys inputs by hid, and a converted dataset shares its source's hid. It guards that `_unconverted` keeps converted inputs wired once keys stop being hids. It's now the first commit, `b582859da0a` "Baseline tests: hid extraction connects an implicitly converted input". That commit also adds the helpers it needs: `_run_grep1_on_converted_input`, `_source_step_id`, and `_assert_single_input_single_tool` (moved to the mixin, now taking `input_name`). This mirrors 26.2's `624a46355ef`. The two branch commits were cherry-picked on top. The tree at the reordered fix commit (`2884001beb5`) is byte-identical to the old head `6336ce84404`, which is kept as `backup/extraction_hid_copies_pdf_sections_26.1_pre_baseline`. **Needs a force-push.**
2. **Helper rule for `POST workflows/extract`.** Three by-ids helpers still did a raw post next to the new `_extract_by_ids_raw`: `_extract_and_download_workflow_by_ids`, `_extract_workflow_id_by_ids` and `_assert_extract_rejected`. They now go through `_extract_by_ids_raw` and a new `_extract_by_ids`, plus `workflow_populator.download_workflow`, which is the same shape as `extract_next_followups` (#24225). Commit `a7768c948ad`.

## Challenged, kept

- **Ported API tests** (`test_workflow_extraction.py`): each body is identical to its #24225 counterpart. The two deliberate exceptions drop the summary-card asserts in `test_extract_with_two_copies_of_one_collection_makes_one_input` and `test_copies_of_job_less_dataset_list_one_input`. Neither test is implementation-only, and each covers a distinct behavior: hid vs by-ids path, copy sent vs original sent, names shared vs different, too few vs too many names, a collection copied from another history, a job-less library import, and a user-tool (UDT) summary row for a non-owner. Kept as-is so merge-forward stays clean.
- **`copy_library_dataset` populator**: justified. Base has no populator for importing a library dataset into a history; four sites in three API test files inline the same post.
- **Markdown unit tests** (`test_markdown_export.py::test_invocation_sections_render_contents` and the `test_workflow_markdown.py` changes): kept at the unit layer.
  - I tried an API test, `workflow_report_json` on the default report. The web report endpoint never expands `invocation_inputs`/`invocation_outputs`; it returns the container directives for the client to expand. So it can't exercise `_invocation_section`, and I dropped the test.
  - Expansion only runs through `to_basic_markdown` (PDF export). That needs weasyprint, or celery for page `prepare_pdf`. The only integration test there checks content-type alone.
  - The edge cases (quotes or newlines in labels, unlabeled or empty outputs) aren't reachable through the API anyway.
  - Mocks follow the existing style of each file. No `SimpleNamespace` or ad-hoc mocks to swap for dataclasses.
- **No E2E.** With the summary card not ported, nothing on 26.1 is UI-facing. The PDF fix only matters for export.

## Not acted on

- The four existing UDT tests (`test_extract_udt_step_with_downstream_tool[_by_ids]`, `test_extraction_summary_includes_udt_step`, `..._invalid_after_role_revoked`) each copy the run-a-user-tool block inline. `_run_user_tool` doesn't fit most of them, since they need the job id or the tool. They're existing tests, and changing them would add churn to a backport. #24225 doesn't change them either.
- `test_hid_extract_copies_sent_with_one_name_make_one_input` does a raw post to `extract_workflow`, asserts 200, then downloads. That pattern is used once, so it gets no helper (rule is more than one use).

## Red/green

- With the branch's source files overwritten by their base versions: the baseline test **passed**, as required.
- Markdown unit tests: with base `markdown_util.py`, the 5 new or modified tests fail. `test_inputs_section_expansion_keeps_labels_in_headings` fails at its own `validate_galaxy_markdown` check (it emits invalid markup); the rest fail at their asserts. With the fix, both files pass: 40 passed.
- The other ported API tests failed on base, per the earlier red check recorded in `index.md`. The reorder left their bodies and the source unchanged, so I didn't re-run them on base.
- Full `test_workflow_extraction.py` on the new head: 62 passed, 1 skipped.

## Tests run

- `test/unit/app/managers/test_markdown_export.py` and `test/unit/workflows/test_workflow_markdown.py`: 40 passed with the fix; 5 failed with base `markdown_util.py`.
- API, single process on port 8771, against base source: the baseline test PASSED. The dropped report test FAILED, because the endpoint never expands sections; that's why it was dropped.
- API, full `lib/galaxy_test/api/test_workflow_extraction.py` on head `a7768c948ad`: 62 passed, 1 skipped (same as before the challenge). The skip is the existing `test_extract_copied_mapping_from_history_reimported`, which raises `SkipTest` unconditionally. `test_copies_of_job_less_dataset_list_one_input` was run on its own to rule it out: it passed.
