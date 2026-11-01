# Codex review

Run via gpt-6.1-sol (Codex reported no reasoning effort).

I acted on Codex's single finding. It was confirmed and fixed. The batch exemption in `from_json` checked only for a truthy `batch` flag. But `meta.py` expands a value only when it has a `values` wrapper (`is_batch` requires `"values" in value`). So a direct reference such as `{"src": "hdca", "id": <list>, "batch": true}` was bound directly while skipping the type check. The exemption now also requires `"values"`. `test_paired_input_rejects_list_flagged_batch_without_values` in `test_tool_execute.py` covers the case. It runs in the flat and nested formats and is skipped for tool requests, whose schema validates inputs first.

Nothing was left unaddressed.

The first Codex run read no files, because its sandbox could not run commands (`bwrap: loopback: Failed RTM_NEWADDR`). It returned an empty review. The second run had the diff and the surrounding source inlined into the prompt: the `DataCollectionToolParameter` and `BaseDataToolParameter` code, `meta.py` expansion, `check_param`, `map_over.py`, the collection type algebra, adapters, subcollection splitting, job-prep validation and the workflow module runtime state. It still could not run tests.

<details><summary>Codex output</summary>

- **P2, correctness, certain.** `lib/galaxy/tools/parameters/basic.py:3080`: "A batch flag on a direct reference bypasses collection-type validation". `is_unexpanded_batch` recognizes any mapping with a truthy batch flag, even one without a `values` wrapper. But `expand_meta_parameters` only expands mappings that contain `values`. A direct collection reference carrying `batch=True` therefore stays a direct binding, yet skips `_check_collection_type`. Example: submit `f1={"src":"hdca","id":<list HDCA>,"batch":true}` to `collection_paired_test`.
- **Coverage notes:** "Reviewed only the supplied diff and surrounding excerpts. Commands and tests were unavailable."

</details>
