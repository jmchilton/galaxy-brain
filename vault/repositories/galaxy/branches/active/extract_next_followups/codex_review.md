# Codex review, second pass (origin/dev...dce789aa030): debrief

Acted on F1: CONFIRMED red-first and fixed in `96ed111849a`. It isn't a branch regression; dev has the same bug. But it sits on the input-card path the branch now owns (E2), and the fix is small. Didn't act on F2: it's a recorded trade-off, NEEDS-DECISION for John. Pushed; head `96ed111849a`.

**Dev-pinned contract change, please look:** the fix changes a test that already exists on dev. `test_referenced_copied_collection_normalizes_to_original` (`test_pages_history_attached.py`) asserted "the summary row carries the original id", which is exactly what Codex flagged.
- I re-pinned it at the same strength. The only `input_collection` row now lists just the in-history copy, `seeded is True` still holds, and there are still no tool rows.
- `seeded` still proves identity normalizes to the original, because `_input_seeding` compares `original_content_ref`.
- Rationale: dev was already inconsistent. HDA rows carried the local copy id; only HDCAs were swapped to the source.

The Codex run itself reported "Focused backend tests: 75 passed; client extraction-form tests passed".

Not acted on:
- F1, the tool-row half: a copied collection that is a *step's* output still serializes as the original id. That id only feeds output-label hints. Extracting that step also needs `get_accessible_job` on the source job, so a revoked source history fails there anyway. That would be a broader redesign, out of scope.
- F1, synthesized boundary rows (`_synthesize_boundary_inputs`) still resolve the original by ref. They're mostly built for refs with no row in this history. One case is untested: a boundary ref whose only presence here is an output of an unseeded tool row is left out of `represented_keys`, so its synthesized row could carry a source id while a local copy exists.
- F2: no code change (as briefed). See below.

<details>

## F1 (P2): copied collection's input card carries the source HDCA id. CONFIRMED (pre-existing on dev; fixed)

Codex: "Collection summarization replaces the local HDCA with its original (`get_original_hdca`) before recording the summary datasets. Consequently, the new input grouping (E2, `group_inputs_by_original` + per-original summary rows) serializes the source ID/name and discards local copies. The form submits that source ID, and `group_inputs_by_original` access-checks its history through the collection manager. Access to the local copy does not imply access to the source history. Failure: copy a collection from another user's shared history into your history, then the owner revokes source-history access. Notebook references your local collection; extract. The summary supplies the original HDCA id, so submission fails the source-history access check though the local collection is accessible. Multiple local copies also appear as only the source collection."

Evidence:
- Branch: `extract.py:495` `dataset_collection = get_original_hdca(dataset_collection)`, then records that original in `self.jobs`. `group_inputs_by_original` (`extract.py:817`) calls `_accessible_content` (`:790`), which uses `get_dataset_collection_instance(trans, "history", id)`. That runs `error_unless_accessible` on the HDCA's **own** history (`managers/collections.py:971`).
- Not a regression:
  - Pre-E2 `d4d504fb3c1` has the same swap at `extract.py:495`.
  - origin/dev `5ff1e46b8c3` has it at `extract.py:490` (`_original_hdca`). Dev's summary serialized those datasets as-is: `workflow_extraction_summary.py:355`, reached via the fake-job path `:384` and the non-workflow-compatible path `:430`. Dev's `extract_steps_by_ids` ran the same collection-manager check on each `hdca_id` (`extract.py:914`).
  - So dev's card also carried the source id, and listed each copy as a separate source-id card.
  - E2 only changed the grouping: one card per original. It didn't change which id the card carries.
- HDA analogue is fine on dev and the branch: `__summarize_dataset` records the local `dataset`, not its original (`extract.py:564-575`). Only the HDCA was swapped.
- Red: new API test `test_copies_from_a_history_no_longer_shared_extract_by_local_ids`. Another user publishes a history with a dataset and a list. We copy the dataset once and the list twice, then the owner runs `disable_link_access`. The test first asserts that extracting with `hdca_ids=[source]` is rejected (400/403), which proves access really was revoked. Failed before the fix: the collection row's ids were `[source]`, expected `[copy1, copy2]`. The HDA row was already local. Rows are picked by step type because encoded HDA and HDCA ids can coincide.

Fix (`workflow_extraction_summary.py`):
- New `_collections_by_original(history)` maps original ref to this history's HDCAs, via `history.contents_iter(types=["dataset_collection"])`. That's the same content set `summarize` walks.
- `_summary_rows` fills an input row for a collection with those in-history HDCAs instead of the recorded original. Grouping is still by `original_content_ref`, so copies still collapse to one card and one input step.
- `summarize`/`WorkflowSummary` are untouched, so legacy hid-based `extract_steps` is unaffected. No client change: the form already sends every output id of a card.
- Side effects:
  - The card now shows the local hids, not the source history's hid.
  - The existing `test_extract_with_two_copies_of_one_collection_makes_one_input` was strengthened. It now expects `[hdca, copy]` where it expected `[hdca]` (the "only the source collection" symptom).

Tests / runs:
- New and strengthened API tests: red, then green.
- `test_workflow_extraction.py` full file, with the fix in place: 113 passed, 1 skipped. The skip is the pre-existing "Mapping connection for copied collections not yet implemented in history import/export". The new test was re-run green after its rejection assertion was added.
- `TestNotebookWorkflowExtractionSummary`: 1 failure, `test_referenced_copied_collection_normalizes_to_original`, a dev test pinning the old behavior. It was re-pinned (see top), then the whole `test_pages_history_attached.py` (57) plus the extraction file's copies/copied tests ran: 68 passed, 1 skipped (same skip).
- Extract unit tests (`test_extract_summary.py`, `test_extract_report.py`, `test_extract_parameters.py`, `test_workflow_extraction_summary.py`): 85 passed.
- mypy on the module: clean, apart from a pre-existing unrelated `notification.py:862` error.
- No client change, so no vitest run.

## F2 (P2): zero-input foreign-history jobs are boundary inputs. NEEDS-DECISION

Codex: zero-input jobs from another history (e.g. `create_2` in a wholly copied history) are classified as boundary inputs. Their output is seeded as an input rather than the generator becoming a step.

- Code: `workflow_extraction_summary.py:92` `return not input_keys or not input_keys <= self.local_keys`. The `not input_keys` arm makes every zero-input foreign job a boundary.
- Already recorded as a deliberate trade-off: earlier_drafts/1/implementation_debrief.md:54, "Zero-input cross-history jobs stay boundaries (existing unit test expects it)". Unit test: `test_cross_history_producer_is_boundary` (`test/unit/app/managers/test_workflow_extraction_summary.py:231`).
- Pro of changing (treat a zero-input foreign job as a step): an imported or copied history keeps its generator tools (`create_2`, random data) as steps, consistent with "copied history keeps its producers".
- Con: a single dataset copied from someone else's history, made by a zero-input tool, would pull that foreign job in as a step. That's the case the boundary exists to avoid, and it can't be told apart from a whole-history copy without a history-level "copied from" signal.

</details>
