# Thermo-nuclear code quality review, second pass: extract_next_followups

**Top line.** The new code (E1–E4, Codex F1) holds up. I found no structural regression and no file newly crossing 1k lines. `_collections_by_original` does not duplicate `group_inputs_by_original`. Acted on two tiny tidies: `trans.user` in place of `getattr(trans, "user", None)`, and an accurate by-ids validation docstring. Left the content-ref module move and the double input grouping as listed items. First-pass #3 (copies rule in three layers) is resolved by E2. The upstream IndexError it flagged is fixed by E1.

## Answer: does `_collections_by_original` duplicate `group_inputs_by_original`?

No. They share only the key (`original_content_ref`), which is already one shared helper.
- `group_inputs_by_original` works on payload ids. It access-checks each one, keeps one input per original (first copy wins) and rejects copies sent with different names.
- `_collections_by_original` works on this history's HDCAs. It keeps every copy per original, for display on the input card.

Different inputs, different outputs. Merging them would need a mode flag.

The substitution sits at the input-row level on purpose. `summarize` swaps an HDCA for its original, and it also feeds the legacy hid `extract_steps` and the tool rows. Fixing it there would append each local copy as an extra output of a real job's tool row. The tool-row half is already parked in codex_review.md.

## Not acted on

- **Content-ref helpers stay in `workflow/extract.py`.** The move doesn't buy what it promises:
  - The summary module still imports `summarize`, `FakeJob` and `DatasetCollectionCreationJob` from `galaxy.workflow.extract`, so the managers -> `workflow.extract` import edge survives.
  - Dev's `extract.py` is already 1131 lines (branch: 1162), so the 1k rule never fires, and moving ~70 lines leaves it over 1k anyway.
  - No layering or size win, only renamed imports. Not worth it now.
- **`group_inputs_by_original` runs twice per by-ids request**, once in `_validate_extract_by_ids_payload` and once in `extract_steps_by_ids`, with access checks and copy-chain walks each time.
  - Fix sketch: validation returns the groups, and `extract_workflow_by_ids`/`extract_steps_by_ids` take `input_groups` in place of ids + names.
  - Not done: it takes the per-id access check out of `extract_steps_by_ids`, which changes who owns a security check. It also matches dev's existing validate-then-extract pattern (jobs and output labels are checked twice too).
- **`_INPUT_FIELDS` puts payload field names into `workflow/extract.py`.** Deliberate: `737377a6efa` named the payload fields in the 400 at the reviewer's request, and the same function already names `output_labels` in its errors.
- **The page path walks history contents three times** (`summarize`, `HistoryBoundary.of`, `_collections_by_original`). A performance note, not a structure problem. Folding them into one index adds a kind branch, because HDA input rows must keep `summarize`'s filtering (hidden elements, non-ready datasets).
- **`_summary_rows` `None` placeholder.** The two-phase build is inherent: HDA copies arrive from separate summary jobs, so a row's copies are only known at the end. The alternatives I tried (slot unions, a second pass) weren't clearer. Kept.
- **`resolve_content` single-return tidy.** Tried and reverted. `sa_session.get` is typed `Any`, so mypy's warn-return-any needs the typed local.
- **Already decided / parked**: earlier_drafts/1 "Not acted on" (H2, H3, M7, `creating[:1]`, zero-input boundaries, endpoint naming, `report_title`); Codex F2 (NEEDS-DECISION); Codex F1 tool-row and synthesized-boundary halves; first-pass #5 nits (`exposed`/`referenced_by_report`, `PageManager` message, star `:disabled`). Not re-reviewed.

<details>
<summary>Full review</summary>

Scope: `git diff origin/dev...96ed111849a` (35 files, +2582/-1149). Weighted to `d4d504fb3c1..96ed111849a` (E1–E4 and F1: 10 files, +415/-153).

**1k-line check.** No file newly crosses 1000 lines. `workflow/extract.py` 1131 -> 1162, `markdown_util.py` 1637 -> 1634; `populators.py`, `selenium/framework.py` and `test_workflow_extraction.py` were already over on dev. `workflow_extraction_summary.py` 531 -> 587; the other extraction managers are under 400; `services/workflows.py` 652 -> 647.

**First-pass items.** #1 (`IdKey`) and #2 (`HistoryBoundary`) were done in pass 1 and hold. #3 is resolved by E2: one `group_inputs_by_original` serves validation and extraction, the service's `_distinct_input_names` and its magic tail are gone, and the client sends one name per card. #4 is reconsidered above (skipped). #5 is unchanged and was already parked.

### E1: names parallel to ids (`_validate_parallel_names`)

Clean. One small helper, called for both the hid and the by-ids payloads, with field names in the message. It runs before `group_inputs_by_original` indexes `names[i]`, so the documented precondition ("empty or parallel") is enforced at the boundary. Moving the check into `group_inputs_by_original` would cover by-ids only; the hid path would still need it. Keep.

### E2: one input per original

- `InputGroup` and `group_inputs_by_original` are the right abstraction: one place decides "copies are one input" and "copies share a name".
- `extract_steps_by_ids` lost its two near-identical input loops for one loop over groups. That is a real simplification.
- `_input_names` is a thin helper, but it states the "one name per input" contract at both call sites. OK.
- Structural cost: the double call (listed above).
- `_INPUT_FIELDS` maps kind to field names and noun only for one error message. Slightly API-flavoured for the model layer, but deliberate (listed).

### E3: `_invocation_section`

Good code judo: four near-duplicate f-string blocks collapse to one helper. It also fixes the unquoted `input=` collection directive dev emitted. It skips an unquotable label silently, which matches the report rewriter's policy.

### E4: `HistoryBoundary.of(history)`

A one-line classmethod over `all_contents`, keyed through `original_content_ref`. Right home: the boundary owns its key set. The docstring says why it is `all_contents` and not the summary's filtered set. Cost: another walk of the history (listed).

### F1: `_collections_by_original`

- Placement is right (see the answer above).
- The `collections_here.get(ref, [item])` fallback only fires for HDA refs, since the map holds collections only. Readable enough with the docstring.
- Dedupe by `all(data.id != ...)` is linear but the lists hold copies of one original, so they are tiny.
- `SummaryDatasets` reused for "collections of one original" with `None` names: acceptable, because input rows ignore names.

### Smaller

- `_accessible_content` used `getattr(trans, "user", None)`, a defensive relic copied from dev's `extract_steps_by_ids`. `ProvidesHistoryContext.user` exists. Fixed.
- `_validate_extract_by_ids_payload` docstring still said it checks only job/ICJ rows. It now also groups input names and validates output labels. Fixed.
- `resolve_content` keeps its typed local; see the not-acted list.
- Tests: the new API tests use existing helpers (`_only_row_listing`, `_rows_by_type`, `_assert_extract_rejected`). `copy_library_dataset` is a new populator method; existing tests inline the same POST, so it's a reasonable reusable addition.

</details>

## Commits (pushed to `jmchilton/extract_next_followups`)

- `9330c4c8feb` Tidy extraction helpers: `trans.user` for HDA access; by-ids validation docstring. Behavior unchanged.

## Runs (after the commit)

- Unit (`test/unit/workflows/`, `test_workflow_extraction_summary.py`, `test_markdown_validate.py`, `test_markdown_export.py`): 280 passed, 1 skipped.
- mypy (from `lib/`) on `extract.py`, the extraction managers and `services/workflows.py`: clean except `galaxy/managers/notification.py:862` (untouched, env noise).
- ruff and pre-commit hooks: clean.
- API `test_workflow_extraction.py`: 113 passed, 1 skipped (9m21s). The one skip is the known "Mapping connection for copied collections not yet implemented in history import/export". Tool conf and `GALAXY_TEST_REQUIRE_ALL_NEEDED_TOOLS=1` set.
- API `test_pages_history_attached.py`: 57 passed, 0 skipped (1m30s), same env.
- Client: no client change, so vitest and vue-tsc not needed.
