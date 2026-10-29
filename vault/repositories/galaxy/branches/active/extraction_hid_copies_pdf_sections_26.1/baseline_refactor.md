Run via Claude Opus 5.5 at high effort.

One more refactor now sits on base, as the third commit: `create_workflow_extraction_summary` builds its input-dataset and input-collection rows in one `input_row` helper. Before, the FakeJob branch and the not-workflow-compatible branch each had a copy of the same `WorkflowExtractionJob` literal. Taking that out of the re-scope commit shrinks the summary fix's `histories.py` diff from +46/−31 to +29/−5, and what's left is just the grouping. Last round's test-helper refactor stays as commit 2. The final tree is identical to the old head `ed8b2b5b188`. New head `2f0cd130446`. Not pushed.

## New history

Base `origin/release_26.1` `19281d57645` (unchanged).

1. `aa07cf68c2f` Baseline tests: hid extraction connects an implicitly converted input (same SHA)
2. `5c8c0d23489` Route by-ids extraction test helpers through `_extract_by_ids[_raw]` (same SHA; refactor from the last round)
3. **`d24ba1df126` Build extraction summary input rows in one input_row helper** (new refactor)
4. `4ffc90509f7` Expand invocation_inputs/outputs to object ids so PDF export renders them (was `40125f461e5`, clean rebase)
5. `96db02d899e` Extraction: copies of one original are one input; 400 for unparallel names (was `0174a1c6417`, clean rebase; its `histories.py` hunk is still only the widened `except`)
6. `d3e327d5dcd` Extraction summary: one input card per original, listing in-history copies (was `aa89b0b4ed2`; `histories.py` conflict resolved by taking `aa89b0b4ed2`'s file as-is)
7. `3f571f849c5` Test job-less collection copies share one extraction input card (was `a3ab534a1c6`)
8. `2f0cd130446` E2E: extraction form extracts a list and its in-history copy as one input (was `ed8b2b5b188`)

Restore point: local `backup/extraction_hid_copies_pdf_sections_26.1_pre_baseline_refactor_2` at `ed8b2b5b188`. The earlier backups weren't touched.

## The refactor (`d24ba1df126`)

`lib/galaxy/webapps/galaxy/services/histories.py` (+19/−28):
- Adds a closure, `input_row(producer_name, copies: list[HistoryItem])`. It serializes `copies`, takes `checked` as any copy not deleted, and returns the input-step row. This is the same body and signature the summary fix uses, so the fix doesn't touch it.
- Both base call sites become `jobs_list.append(input_row(<name>, [data for _, data in datasets]))`.
- `outputs` and `checked` are now computed inside the non-fake `else:`, where the tool row and the invalid-tool row use them.
- Adds the `HistoryItem` import. `Union`, `_original_key` and `IdKey` stay with the fix.
- Behavior is unchanged: the same datasets, in the same order, give the same outputs and `checked`.
- One cost: a not-workflow-compatible (upload) job goes through `else:` and then through `input_row`, so its outputs are serialized twice. Base serialized them once. Each serialization is a `model_validate` over attributes that are already loaded, so it's cheap. The fix commit has the same cost.

The commit message was amended once to state this accurately. The amend left the tree as it was, which was first committed as `e209190e850`, the SHA the tests ran against. `git range-diff` shows every later commit is `=` (same patch, same tree), so the test results below are still valid.

**Why it belongs on base:**
- It changes code that already exists on `release_26.1`, keeps base behavior, and has two callers there.
- `release_26.2` made the same split before #24225, as module-level `_input_extraction_row`. So this is 26.2's shape, not a 26.1-only invention.

**Merge-forward and size of the gain:**
- Merge-forward is unaffected. `histories.py`'s summary body already conflicts with 26.2, where it moved to `managers/workflow_extraction_summary.py`, and the resolution is still to take 26.2's side.
- The gain is modest and 26.1-only: a reviewer sees the dedup apart from the grouping change. The closure keeps the existing `input_row` name rather than 26.2's `_input_extraction_row`, so the final tree doesn't change.

## Candidates considered, not moved

**New commits (re-scope, test, E2E):**
- **Converting base's inline `[j for j in summary["jobs"] if j["step_type"] == ...]` filters to `_rows_by_type`.** There are seven such sites on base. `release_26.2` and `extract_next_followups` both have `_rows_by_type` and still keep those sites inline. Converting them here would diverge from 26.2's text and invite merge-forward conflicts.
- **`_rows_by_type` / `_only_row_listing` on their own.** No base caller (see above). They stay with the tests that use them.
- **`collections_here` / `add_inputs` / the `IdKey` placeholder in `jobs_list`.** These are the fix itself, and they need `_original_key`/`IdKey`, which commit 5 introduces.
- **Hoisting the input-vs-tool classification ahead of the tool-row build** (26.2's `_input_producer_name`). The thermo review declined it, and that still holds as a base refactor. It would re-indent the whole loop on 26.1 for a hunk that merge-forward replaces with 26.2's version. With `input_row` already shared, all it would add is skipping the extra `serialize_output` calls for upload jobs.
- **The two `navigation.yml` selectors (`input_collection_card`, `input_collection_item_by_hid`).** No base caller. No existing extraction Selenium test selects an input-collection card or an item by hid.
- **Splitting `a3ab534a1c6` (now `3f571f849c5`) into the fix commit, or making it a Baseline.** It fails on base (two collection rows), so it isn't Baseline material. Keeping it as its own commit is a history choice, not a refactor.

**Older commits, rechecked; last round's reasons still hold:**
- **`_invocation_section` (markdown_util).** It is the fix. A base-behavior version would have to keep base's unquoted `input={label}` quirk, and the fix would then rewrite its whole body.
- **`_validate_parallel_names` and the widened `except`.** Both change behavior: 500→400, and 403→a per-row flag.
- **Hoisting `IdKey`/`IdAssociations`/`InputKind`; adding `_original_key`.** On base these only serve the by-ids path, and the fix removes the sites they would replace. Splitting them out means hand-cutting interleaved `extract.py` hunks for about 10 lines.
- **Dropping `WorkflowSummary`'s hid bookkeeping.** It can only go once the hid path stops keying by hid.
- **`copy_library_dataset` populator.** No base caller. #24225's baseline pass declined it too.
- **Moving `_get_extraction_summary` into the mixin; `_extract_from_history_raw`.** No base caller outside the code that already has them.
- **Thermo deferrals** (unify `InputGroup`/`HidInputGroup`, `_INPUT_FIELDS` tuples, the three-site `step_labels` dedup). These stay deferred to dev/26.2, because they'd move `extract.py` away from #24225.

## Validation

- `git diff ed8b2b5b188 2f0cd130446` is empty.
- At `d24ba1df126` (base + Baseline + both refactors):
  - API `lib/galaxy_test/api/test_workflow_extraction.py`, run as one process on port 8791: **49 passed, 1 skipped**. The skip is the existing unconditional `SkipTest`. This file at that commit includes base's `extraction_summary` tests (job-less inputs, collection input rows, tool rows, mapped tool rows).
  - `ruff check`, `black --check`, `isort --check-only` and `mypy` on `histories.py`: clean. Pre-commit hooks passed.
- At head `2f0cd130446`:
  - Unit `test/unit/app/managers/test_markdown_export.py` + `test/unit/workflows/test_workflow_markdown.py`: **40 passed**.
  - API `test_workflow_extraction.py`, one process on port 8791: **66 passed, 1 skipped**. The skip is the same existing `SkipTest`. The count is one higher than the test challenge's 65 because the codex re-harden later added `test_extract_by_ids_keeps_empty_input_name` to the extraction-fix commit. The tree is unchanged from `ed8b2b5b188`.
  - All 9 changed Python files: `ruff check`, `black --check` and `isort --check-only` clean.
  - `mypy` on the 8 non-Selenium files: clean. The Selenium file is left out because it pulls in pre-existing `framework.py` errors (see the thermo review).

## Notes

- SHAs from `4ffc90509f7` onward changed. `test_challenges_debrief.md`, `thermo_nuclear_review.md`, `implementation_rescope_debrief.md`, `alts/original_scope.md` and `index.md` cite the old ones (`40125f461e5`, `0174a1c6417`, `aa89b0b4ed2`, `a3ab534a1c6`, `ed8b2b5b188`, and the earlier `902573855de`/`d4a9284f451`). Those are now only reachable via the backup refs. The alt branch (`..._alt_original_scope` at `6189791f58c`) isn't affected.
- Needs a force-push.
- Nothing security-sensitive found. Nothing here points to BLOCKED.
