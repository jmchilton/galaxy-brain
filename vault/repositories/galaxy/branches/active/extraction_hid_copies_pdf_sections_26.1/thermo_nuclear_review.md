Run via Claude Opus 5.5 at high effort.

# Thermo-nuclear review (re-harden): extraction_hid_copies_pdf_sections_26.1

**Top line:** No code changes this round. I reviewed the whole branch fresh at `ed8b2b5b188` (7 commits, Baseline still first) and found no correctness bugs and nothing security-sensitive.

The one new piece of 26.1-specific code is `create_workflow_extraction_summary`, from the re-scope. It is a faithful, smaller port of #24225's `_summary_rows`. What the prompt flags there is structural:
- four closures sharing mutable state
- a mixed-type placeholder list
- an input-vs-step classification that could be hoisted

That whole hunk is replaced by 26.2's `workflow_extraction_summary.py` on merge-forward, so restructuring it on a release branch is churn that nobody downstream keeps. I declined each item and recorded why below. Head is unchanged, nothing to push beyond the force-push the branch already needs.

Status-relevant: nothing BLOCKED. One landing precondition carries over from the re-scope: #24225 must reach `release_26.2` before this branch merges forward. Otherwise taking 26.2's side of `histories.py` drops the summary fix, while the five summary tests merge in and fail.

## Not acted on

**New code in `histories.py` (`create_workflow_extraction_summary`)**
- **Hoist input classification ahead of the tool-row build.** This is the code judo: decide "input producer?" first (fake job, or a tool that isn't workflow-compatible), then build the step row. #24225 does this with `_input_producer_name` → `_tool_row`. It would stop computing `outputs`/`checked` for upload jobs that end up in `add_inputs`. Deferred: it saves a few `serialize_output` calls that base already made, it re-indents most of the loop on a release branch, and merge-forward discards this hunk for 26.2's version anyway.
- **Mixed `list[Union[WorkflowExtractionJob, IdKey]]` resolved by `isinstance` at the end.** An `IdKey` stands in for a row that gets filled in later. That's a little magic. #24225 uses an explicit `(None, datasets, producer_name)` slot instead. The current form is short, typed and mypy-narrowed, so it's no clearer to switch. Declined for the same merge-forward reason.
- **Four nested closures (`serialize_output`, `input_step_type`, `input_row`, `add_inputs`) sharing `inputs`/`jobs_list`.** The function is now about 150 lines. 26.2 splits it into module functions. Extracting them here would be a release-branch-only refactor that merge-forward throws away. Declined.
- **`collections_here` re-queries HDCAs that `summarize()` already walked via `all_contents`.** Exposing them from `WorkflowSummary` would save one query. It would also change `extract.py` away from #24225, whose `_collections_by_original` makes the same extra query. Declined.
- **`_original_key` / `IdKey` imported across modules as private names.** The brief says to keep the helper names, and 26.2 replaces them with the public `original_content_ref`. Accepted.
- **`histories.py` growth: 1080 → 1096 lines.** It was already over 1k at base, so the crossing rule doesn't trigger. The growth is noted.

**Ported code in `extract.py` / `markdown_util.py` / `workflows.py` (carried from round 1, rechecked on head)**
- **Unify `InputGroup`/`HidInputGroup` and the two input-step builders.** Code judo, about 40 lines and one concept fewer. Deferred to dev/26.2: it moves `extract.py` away from #24225.
- **`_INPUT_FIELDS` / `_HID_INPUT_FIELDS` positional string triples.** Only the ids field differs between them. Declined: identical to #24225.
- **Validation split across layers.** Parallel-names checking is in the service; copy-name consistency is in `extract.py`. Declined: identical to #24225.
- **`_invocation_section(assoc: Any)`.** Declined: byte-identical to #24225.
- **`hasattr(assoc, "dataset")` and `_original_key`'s `cast`.** These predate the branch or match #24225. Declined.
- **Repeated `if name not in step_labels` dedup (three sites).** It was already there before the branch. Deferred to dev.
- **Test helpers `_run_user_tool` / `_run_user_tool_in_published_history`, `_row_with_output_id` / `_only_row_listing`.** Some single-use layering and near-overlap. Declined: the names and bodies match #24225's test file.

**Resolved since round 1 (not declined):** round 1 declined the `group.name or "Input Dataset"` vs `is not None` split. Codex's re-harden fix changed both by-ids branches to `is not None`, which restores base's `""` behavior, and added `test_extract_by_ids_keeps_empty_input_name`. That deliberately diverges from #24225, which still has the bug. It's also why round 1's merge-forward framing for `extract.py` no longer holds strictly. The divergence is harmless because merge-forward takes 26.2's side.

## Tests (head `ed8b2b5b188`)

- Unit: `test/unit/app/managers/test_markdown_export.py` + `test/unit/workflows/test_workflow_markdown.py`: **40 passed**.
- `ruff check` and `black --check` on all 9 changed Python files: clean.
- `mypy` on the 8 changed non-Selenium files: clean. Adding `lib/galaxy_test/selenium/test_workflow_extraction.py` pulls in 8 errors from `lib/galaxy_test/selenium/framework.py`, which the branch doesn't touch, so they predate it.
- API was not rerun: no `lib/galaxy` change this round. The last full run on the current code was 65 passed, 1 skipped (codex re-harden). The test challenge recorded the Playwright E2E `test_extract_collection_with_in_history_copy` as 1 passed.

<details>
<summary>Full review</summary>

### Verdict

Approve for a release backport. The branch deletes more concepts than it adds:
- The hid path's private keying (`summary.hid()`, the two hid maps, `collection_types`, and the "hid outside current history" warning branches) is gone, replaced by one key-by-original model.
- `markdown_util.py` collapses two four-way if/else copies into `_invocation_section`.
- The summary service now has one input-row builder where it had two copy-pasted `WorkflowExtractionJob(...)` literals.

The structural improvements left on the table are real. They all sit in code that is either byte-identical to #24225 or replaced wholesale by 26.2 on merge-forward, so they belong on dev, not here.

### 1. `create_workflow_extraction_summary` (new, 26.1-specific)

**Fidelity.** Compared against `extract_next_followups:lib/galaxy/managers/workflow_extraction_summary.py` `_summary_rows`/`_collections_by_original`. The two use the same algorithm:
- group input-producer outputs by original across producers
- place each row where its original is first seen
- list in-history HDCA copies in place of the original `summarize()` recorded
- fall back to the item itself for datasets

The one difference is the closure/notebook seeding, which is intentionally not ported because 26.1 has no notebook closure.

**Correctness, checked:**
- **Collection keys always have a local entry in `collections_here`.** `summarize()` iterates only this history's `all_contents`, and every collection it records is `_original_hdca(local)`, whose key equals the local copy's key. So the `[data]` fallback is reached only by datasets, and those are already local in `summarize()`'s lists.
- **`DatasetCollectionCreationJob` / `FakeJob` instances don't define `__eq__`/`__hash__`.** Each copy gets its own job key, so merging has to happen in `add_inputs`, and it does.
- **`copy not in copies` uses identity.** None of the model classes involved override `__eq__`; the only `__eq__` in `model/__init__.py` is on `FakeDatasetAssociation`. Inside one session that's equivalent to #24225's `.id` compare.
- **`checked` is now computed over local copies.** It used to come from the source HDCA's `deleted`, so this is an improvement.
- **`IdKey` carries the kind,** so dataset and collection keys can't collide.
- **Deleted, hidden and purged HDCAs are included in `collections_here`.** That's consistent with `all_contents`. `get_dataset_collection_instance` does no deleted check, so a card posting a deleted copy doesn't 400 (verified by the re-scope review).

**Structure (declined, see the list above):**
- `jobs_list` mixes finished rows and `IdKey` placeholders. That's a small "magic" shape where 26.2 uses an explicit `None` slot.
- The fake-job and non-compatible-tool branches both call `add_inputs`, but they sit at different nesting depths. The second also pays for `outputs`/`checked` it then discards.
- The cleaner shape is 26.2's: classify the producer first, then either `add_inputs` or build a tool/invalid row.
- That reshape is the right one for dev. On 26.1 it would re-indent the loop for a hunk that merge-forward replaces, so the cost outweighs the benefit here.

**Layering.** Summary-row construction living in the histories service is pre-existing, and 26.2 moves it to `managers/workflow_extraction_summary.py`. Not this branch's concern.

### 2. `extract.py`

- Key-by-original wiring for both the hid and by-ids paths is the right model. The hid path stops being a parallel universe.
- **Missed code judo, deferred.** `InputGroup` and `HidInputGroup` are one concept. The hid variant only adds a "hid not found" hole and resolves contents differently. A resolver-agnostic grouping plus one `_input_steps` builder would delete `HidInputGroup`, `_HID_INPUT_FIELDS`, one grouping body and the two hid loops. Deferred because the brief says to keep the helper names and #24225's shape.
- `InputKind` is declared once next to `IdKey` (the round-1 fix is still in place).
- Default names: both paths now use `is not None` (codex fix). One rule, consistent with base.
- 832 → 892 lines, under 1k.

### 3. `markdown_util.py`

- `_invocation_section` deletes duplicated branches and fixes the unquoted `input={label}` collection directive by switching to object ids.
- `assoc: Any` is the only typing smell. It's byte-identical to #24225, so declined.
- 1448 → 1438 lines (it shrinks).

### 4. `workflows.py`

- `_validate_parallel_names` is called from both endpoints. It's a small, direct helper and not scattered.
- Round 1 already recorded the split from copy-name validation in `extract.py`.

### 5. Tests

- **API.** Helpers were consolidated into `_ExtractionHelpersMixin`. The new summary tests assert row identity and order by local ids, then extract through the same ids, so they pin both the card and the payload the form would send.
- **Unchanged-call-site check.** `_assert_single_input_single_tool` gained `input_name` as its second positional parameter. Every caller passes `expected_tool_id` by keyword, so none was silently rebound.
- **E2E.** It uses two new navigation.yml selectors over attributes that are already rendered (`data-step-type`, `data-hid`). Its helpers exist on 26.1: `copy_collection` and `assert_input_step_collection_type`.
- **`populators.copy_library_dataset`** earns its place as a reusable populator method.

### 6. Size

| File | Base | Head | Note |
|---|---|---|---|
| `histories.py` | 1080 | 1096 | already over 1k |
| `extract.py` | 832 | 892 | |
| `markdown_util.py` | 1448 | 1438 | shrinks |
| API test file | 1508 | 1884 | already over 1k; same file #24225 grows |

No crossing caused by this branch.

### 7. Merge-forward / landing

- `histories.py` summary hunk: take 26.2's side.
- The test additions match #24225's text.
- Precondition: #24225 must land on `release_26.2` first, or the five summary tests (four from the re-scope, plus the job-less collection test) arrive without their fix.

</details>
