Run via Claude Opus 5.5 at high effort.

# Scope evaluation: extraction_hid_copies_pdf_sections_26.1

**Recommendation: expand (modestly).** Keep everything as implemented. Add the 26.1-shaped half of #24225's "one summary card per original" (`90b36ff9158` + `202d3b3570c`) to `HistoriesService.create_workflow_extraction_summary` in `services/histories.py`. Then restore the summary-card asserts that were dropped from `test_extract_with_two_copies_of_one_collection_makes_one_input` and `test_copies_of_job_less_dataset_list_one_input`.

The branch fixes copies at the extraction layer, but the 26.1 history UI reaches extraction only through the summary, and the summary still mishandles copies. The symptoms below are inferred from the code and from #24225's commit messages. I haven't reproduced them.
- **Copied collections.** Cards list the source HDCA instead of this history's copy, and list it once per copy.
  - If the history holds the original plus a copy, or two copies, checking those cards (they're checked by default) sends duplicate `hdca_ids`, and the existing "contains duplicates" check returns a 400.
  - A single copy from another history sends the source id. That fails only if the user can no longer access the source history.
- **Job-less dataset copies.** These still show as one card per copy. Rename one card and you now get this branch's new "copies … with different names" 400.

The reason given for not porting was "`workflow_extraction_summary.py` doesn't exist on 26.1". That's a reason the code lives somewhere else, not a reason the bug is absent. The 26.1 summary body lives in `histories.py`, which this branch already edits. Estimate: about 30–50 production lines plus 2–3 API tests.

Branch at head `6189791f58c` (base `origin/release_26.1` `19281d57645`): 4 commits, 8 files, +591/−168. Of that, about 350 changed lines are production code (`extract.py` 276, `markdown_util.py` 50, `services/workflows.py` 19, `services/histories.py` 3) and about 410 are test code. `index.md`'s SHAs are stale.

## Possible Decompositions

Options for John, not recommendations. Current commits:

1. `aa07cf68c2f` Baseline tests: hid extraction connects an implicitly converted input (test only).
2. `5c8c0d23489` Route by-ids helpers through `_extract_by_ids[_raw]` (test-only refactor).
3. `40125f461e5` Expand `invocation_inputs`/`invocation_outputs` to object ids (`markdown_util.py` + 2 unit test files).
4. `6189791f58c` Copies as one input, 400 for unparallel names, and the user-tool summary flag (`extract.py`, `services/workflows.py`, `services/histories.py`, API tests, `copy_library_dataset` populator).

Order constraints:
- Commit 3 is fully independent. It touches no file the others touch.
- Commit 4's tests use `_extract_by_ids_raw` (from commit 2) and `_run_grep1_on_converted_input` / `_assert_single_input_single_tool` (from commit 1).
- The `copy_library_dataset` populator is only used by `test_copies_of_job_less_dataset_list_one_input`.

**Option A: as committed (1 PR).** Commits 1–4 together. The four fixes share only `test_workflow_extraction.py` helpers.

**Option B: PDF split (2 PRs).**
1. Commit 3 alone: invocation-section PDF export, about 100 lines with unit tests only.
2. Commits 1, 2, 4: extraction.

Each PR can land on its own, in either order.

**Option C: by concern (4 PRs).**
1. Commit 3 (PDF export). Independent.
2. Commits 1 + 2 (baseline + test-helper refactor). No behavior change, so it can go first or fold into PR 4.
3. **Small service fixes**, cut out of commit 4:
   - the `_validate_parallel_names` 400 (`services/workflows.py` + `test_extract_names_not_parallel_to_ids_rejected` and `test_extract_from_history_fewer_names_than_hids_rejected`)
   - the `ItemAccessibilityException` widening (`services/histories.py` + `test_extraction_summary_udt_step_invalid_for_non_owner`).

   It needs commit 2's `_extract_by_ids_raw`. It must also carry these mixin helpers, which commit 4 adds:
   - `_extract_from_history_raw`
   - `_get_extraction_summary`
   - `_row_with_output_id`
   - `_run_user_tool`
   - `_run_user_tool_in_published_history`

   PR 4 then reuses them.
4. **Copies as one input** (`extract.py` + remaining API tests + populator), plus the recommended summary-card expansion if done. It comes after PR 2.

The PR 3/PR 4 split means hand-cutting test hunks out of commit 4. In `services/workflows.py` the two concerns don't overlap.

## Scopes considered

### 1. As implemented

This ports four #24225 fixes whose bugs also exist on 26.1:
- PDF export of default-report `invocation_inputs`/`invocation_outputs`
- copies of one original as one input on the hid and by-ids paths, including implicitly converted inputs
- 400 instead of 500 for unparallel names
- a per-row `custom_tool_inaccessible` instead of a whole-summary 403

| Pros | Cons |
|---|---|
| <ul><li>Every ported test was red on bare 26.1 except the baseline, so each fix is a real 26.1 bug</li><li>Production code in `extract.py` and `markdown_util.py` matches #24225's shape, so merge-forward means "take 26.2's side"</li><li>Already hardened: test challenges, Codex review, thermo review, baseline refactor</li></ul> | <ul><li>Fixes copies at extraction but not at the summary that feeds the 26.1 UI, so the UI path for collection copies is still broken (duplicate `hdca_ids` → 400, or a source id that may be inaccessible)</li><li>Adds a new UI-reachable 400 (renaming one of two per-copy dataset cards) without the card change that makes it unreachable in 26.2</li><li>The two ported tests had to drop exactly the summary asserts that would catch this</li></ul> |

### 2. Modest expansion: one input card per original in the 26.1 summary (recommended)

In `create_workflow_extraction_summary` (`services/histories.py`):
- Group input rows (fake jobs and non-workflow-compatible producers such as uploads) by `_original_key`.
- For collections, list this history's in-history copies, not the source HDCA. This is the 26.1 version of `_collections_by_original` / `_summary_rows` from `90b36ff9158` + `202d3b3570c`.

Restore the summary asserts in the two tests noted in `index.md`. Port `test_multi_file_upload_lists_one_input_per_file` and `202d3b3570c`'s copied-collection test where they apply.

| Pros | Cons |
|---|---|
| <ul><li>Closes the UI half of the bug the branch is about. Without it, the 26.1 form gets a 400 when a history holds a collection plus its copy, and fails when a copied collection's source history has become inaccessible</li><li>Makes the branch's new "copies with different names" 400 effectively unreachable from the UI</li><li>Code is already designed and tested in #24225, so this is a port, not new design</li><li>Adds no new merge-forward conflict file: `histories.py`'s summary body already conflicts, because 26.2 moved it to `workflow_extraction_summary.py`. Same resolution: take 26.2's side</li><li>A multi-file upload gets one card per file (distinct names) instead of one shared name with the second step left unlabeled</li></ul> | <ul><li>Changes the row grouping in the summary API response on a release branch (more rows for multi-file uploads, local ids for collection copies)</li><li>About 30–50 production lines written by hand in 26.1's shape, because the 26.2 code depends on `ContentRef` and `workflow_extraction_summary.py`</li><li>Needs a red test first. The duplicate-`hdca_ids` symptom is inferred from code, not reproduced</li><li>Re-opens hardening (review, test challenge) for the new piece</li></ul> |

<details>
<summary>Evidence (26.1 code at the branch head)</summary>

- `WorkflowSummary.__summarize_dataset` keys `FakeJob(dataset)` on the copy when the original has no creating job (library imports, job-less copies). So each copy gets its own card listing its own id.
- `__summarize_dataset_collection` replaces the HDCA with `_original_hdca(...)` before recording it:
  - With a creating job, the same `(name, original)` pair is appended to the representative job once per copy.
  - Without one, a new `DatasetCollectionCreationJob(original)` is created per copy. Neither class defines `__eq__`/`__hash__`, so these are separate cards.

  Either way, the source HDCA id is serialized once per copy.
- `WorkflowExtractionForm.vue` (`selectedInputs`) flatMaps every output of a checked input card under that card's one `newName` and posts it to `workflows/extract`. `_validate_extract_by_ids_payload` rejects repeated ids ("hdca_ids contains duplicates"). `group_inputs_by_original` then access-checks each id via `get_dataset_collection_instance(trans, "history", id)`. For a source HDCA, that check runs against the source history.
- `202d3b3570c`'s message describes the same pre-fix behavior on 26.2, which shares `summarize()`: "summarize() records a copied collection as its original, so input cards carried the source HDCA id. Extraction access-checks that id against the source history… several local copies showed as just the source." `90b36ff9158`: "a copied collection no longer lists its original twice."
- 26.1 has no input-name uniqueness check in the by-ids service. So the multi-file upload case is not a 400 on 26.1. It's a silent loss of distinct names: the second step goes unlabeled because of the `step_labels` dedup.
- `90b36ff9158`'s `WorkflowExtractionForm.vue` hunk only changes a comment, inside `hasDuplicateStepLabels`, which doesn't exist on 26.1. No client change is needed.
- Suggested red tests:
  - Summary of a history with a list and its in-history copy. Assert one input row whose outputs are the in-history ids. Then extract with the row's outputs as the UI would send them, and expect 200 with one `data_collection_input`.
  - A library import and its copy. Assert one input row.

</details>

### 3. Thermo-review deferrals (unify `InputGroup`/`HidInputGroup` and the input-step builders, drop `_INPUT_FIELDS` tuples, one default-name rule, single validation layer, typed `assoc`)

Structural cleanups in `extract.py`/`markdown_util.py` that the thermo review found real but declined.

| Pros | Cons |
|---|---|
| <ul><li>Deletes about 40 lines and the `HidInputGroup` near-twin</li><li>One rule for empty-string default names</li></ul> | <ul><li>Pulls 26.1 away from #24225's shape, so a clean "take 26.2's side" merge-forward turns into real reconciliation</li><li>26.2 doesn't have them either. They belong on dev/26.2 first</li><li>Not a bug fix</li></ul> |

Not recommended here. Route to a dev follow-up.

### 4. Contraction: drop or split off the PDF export fix and/or the user-tool summary flag

Ship only the extraction-copies work, and move `_invocation_section` (and possibly the `histories.py` one-liner) to separate PRs or drop them.

| Pros | Cons |
|---|---|
| <ul><li>Each PR covers a single concern. The PDF fix shares no files with extraction</li></ul> | <ul><li>Both are confirmed 26.1 bugs, red-tested, and small</li><li>Dropping them leaves known release bugs unfixed</li><li>Splitting is a packaging choice, covered under Possible Decompositions, not a scope change</li></ul> |

Not recommended as a scope change.

### 5. Other #24225 fixes: 26.2-only, not applicable

`317a83e9895` (accept quotes and line breaks in labels), `69ad8d9c2a9` (255-char auto-label dedup), `711b09937fc`/`16d161d4d08` (notebook history boundary), `4b389215402` (quote labels in invocation sections), and the notebook report/E2E commits.

| Pros | Cons |
|---|---|
| <ul><li>Would make the backport more complete</li></ul> | <ul><li>Their modules don't exist on `origin/release_26.1`: no `workflow_extraction_naming.py`, `_report.py` or `_summary.py`, and no notebook extraction (#22860 first ships in 26.2)</li><li>`4b389215402` is moot on 26.1, because sections now emit object ids rather than labels</li><li>`0230a122463`'s server name-uniqueness skip targets a check that 26.1 doesn't have</li></ul> |

Out of scope, because the bugs aren't present on 26.1.

## Unresolved questions

- Expand with the summary-card port (scope 2), or ship as is and file it as a 26.1 follow-up?
- If expanding: is it OK for the summary to return more rows for multi-file uploads on a release branch?
