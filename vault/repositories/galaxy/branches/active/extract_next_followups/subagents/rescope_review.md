# Re-scope review (E1–E4, focus E2)

**Top line:** E2 is sound and fits E1/E3/E4; no correctness bugs found. Acted on two things in one follow-up commit (`737377a6efa`): (1) the copies-with-different-names 400 now uses payload field names like E1's message (`hda_ids includes copies of one dataset with different dataset_names: 'numbers' and 'digits'`), test tightened to the exact message, red → green; (2) new API test `test_copies_of_job_less_dataset_list_one_input` covers the untested FakeJob path (library import + in-history copy → one card, one input step), red on the pre-E2 summary module (two rows), green now.

Range: `d4d504fb3c1..df78226dea9`, plus the follow-up.

## Not acted on
- **Legacy HID `extract_steps`**: untouched by E2, keeps its own pre-existing copy semantics (below). Not "consistent" with by-ids, but out of scope; the client doesn't use it.
- **Double grouping per request** (service validation + `extract_steps_by_ids` each call `group_inputs_by_original`, ~2N access lookups): same count as before E2 (`_distinct_input_names` + extraction loops), repeats hit the session identity map. Threading groups through `extract_workflow_by_ids` would widen its signature for little gain.
- **`cast(Job, job)` in `_summary_rows`**: `_input_producer_name` returns `False` only for a real `Job`, so the cast is safe; restructuring to avoid it isn't worth the churn.
- **Pick first name instead of 400** for copies with different names: rejected. The client can't send it (one name per card, one card per original), and dev silently dropped the second name, so nothing relied on it. Matches REVIEW_FOCUS "reject never-working input".

<details>
<summary>Full review</summary>

### Consumers of the summary rows
- Client: only `WorkflowExtractionForm.vue` (via `api/histories.ts` and `api/pages.ts`). It flattens a card's outputs into parallel ids/names with the card's one name, so grouped rows are correct by construction. No fixture or disable-reason still models a card holding several distinct originals; only the comment changed.
- Selenium: `framework.py` helpers count tool cards only (`tool_card_checkbox`); no helper counts input cards or uses multi-file fetch. Both E2E files passed unchanged (phase B run).
- API tests: the only row-shape assertions are in `test_workflow_extraction.py` and `test_pages_history_attached.py`, both updated/run. Unit `test_workflow_extraction_summary.py` tests the closure, not `_summary_rows`.
- `_synthesize_boundary_inputs` builds `represented_keys` from `original_content_ref` over every dataset paired with a row, and grouped rows still carry every copy, so a notebook can't get a synthesized card and a grouped card for one original. One original also can't land in two `_summary_rows` groups: copies follow the original's creating job in `WorkflowSummary`, and job-less originals are merged by ref now.

### Access checks / N+1
- `_accessible_content` uses the same two manager calls dev's `extract_steps_by_ids` used (`hda_manager.get_accessible`, `get_dataset_collection_instance(trans, "history", id)`), so no id dev accepted is newly rejected.
- Ordering change: validation now access-checks ids even when names are omitted (the old `_distinct_input_names` zipped over empty names). An inaccessible id fails earlier with the same exception type.
- Summary side: `original_content_ref` now runs on every upload/fetch output; `WorkflowSummary` already walked the same `copied_from`/`creating_job_associations` in this session.

### `test_twice_copied_output_seeds_one_input`
Faithful restatement, not a weakening. Intent: two copies of one cross-history output become one seeded input. Old shape asserted it as two rows seeded `[False, True]`; new shape asserts exactly one row holds either copy (`(row,) =` unpack), it is `input_dataset`, seeded, and lists both copy ids. The extraction wiring assertions below (one `data_input`, cat1 wired to it) are unchanged.

### New 400 and wording
- 400 vs first name: see "Not acted on".
- Wording was `copies of one hda were given different input names: …`; E1 uses payload fields (`dataset_names has 1 entries but hda_ids has 2; …`) and `step_labels includes job id N …`. Now `{ids_field} includes copies of one {dataset|dataset collection} with different {names_field}: 'a' and 'b'` via a small `_INPUT_FIELDS` map in `extract.py`. `extract_steps_by_ids` params share the payload names, and the service is its only caller.

### Legacy HID `extract_steps`
- Untouched. It keys inputs by hid; tool inputs resolve via `summary.hid(original)` → `hda_hid_in_history[original.id]`, which each copy overwrites, so the last-iterated copy's hid wins. Selecting a different copy's hid likely leaves the tool input unconnected. Copies sent under one name already 400 on duplicate names.
- Pre-existing on dev, not fed by summary rows, and the client uses by-ids only. Moving it to ContentRef wiring is separate work.

### E1–E4 fit
- E1's `_validate_parallel_names` runs before `group_inputs_by_original`, whose `names[i] if names else None` relies on it; the service is the only caller of `extract_workflow_by_ids`, so no IndexError path remains. E2 removed the `names[len(content_ids):]` tail E1 had already made dead.
- E3 (report label quoting) and E4 (`local_keys` over `all_contents`) don't interact with row grouping beyond E4 feeding `produced_elsewhere`, which `_input_producer_name` now consumes.

### General
- Imports at top; `TYPE_CHECKING` import of `Tool` matches the module's existing pattern. Docstrings short.
- No tests weakened or dropped. One assertion tightened (exact error message), one test added.
- No security concerns.

### Runs
- `TestWorkflowExtractionByIdsApi` (with `GALAXY_TEST_TOOL_CONF` sample + functional tool conf, `GALAXY_TEST_REQUIRE_ALL_NEEDED_TOOLS=1`): 60 passed. A first run had one failure in `test_extract_with_cached_job_cross_history`. It passed alone twice and passed in a full rerun, so it is order-dependent job-cache flakiness and not related to E2.
- Note: without `GALAXY_TEST_TOOL_CONF`, `cat1` isn't loaded and `test_multi_file_upload_lists_one_input_per_file` silently skips; run with the tool conf (as `run_tests.sh` does).
- ruff, black, isort clean; mypy on `extract.py` (from `lib/`) clean apart from pre-existing `notification.py:862`.

</details>
