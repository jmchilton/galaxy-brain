# Job cache reuses a mapped-over job for a plain run, returning the wrong `element_identifier`

With `use_cached_job`, running a tool directly on a dataset can reuse an earlier job that ran on the same dataset as an element of a mapped-over collection. If the tool's output depends on `element_identifier`, the cached output carries the collection element's identifier instead of what a plain run produces.

## Reproduction (dev `51e0a80a0db`, stock `identifier_single` test tool)

1. Build a list from an existing dataset named `Test_Dataset`, with element identifier `sample_a`. The `create_list_in_history(..., direct_upload=False)` helper does this.
2. Run `identifier_single` mapped over the list (batch). Output: `identifier sample_a`.
3. Run `identifier_single` directly on the same dataset with `use_cached_job=True`.
   - **Actual:** the job is a cache copy (`copied_from_job_id` set) and its output is `identifier sample_a`.
   - **Expected:** a new run, or a cache hit only on a plain job, giving `identifier Test_Dataset`. For a plain dataset, `$input1.element_identifier` falls back to the dataset name (`DatasetFilenameWrapper.element_identifier`, `tools/wrappers.py`).

<details><summary>Throwaway API test used (run once on dev code, then reverted)</summary>

```python
class TestZZCacheRepro(ApiTestCase):
    def test_zz_cache_plain_after_mapped_xml(self):
        dataset_populator = DatasetPopulator(self.galaxy_interactor)
        collection_populator = DatasetCollectionPopulator(self.galaxy_interactor)
        with dataset_populator.test_history() as history_id:
            hdca = collection_populator.create_list_in_history(
                history_id, contents=[("sample_a", "a\n")], direct_upload=False, wait=True
            ).json()
            element = dataset_populator.get_history_collection_details(history_id, content_id=hdca["id"])["elements"][0]
            hda_id = element["object"]["id"]
            hda_name = dataset_populator.get_history_dataset_details(history_id, dataset_id=hda_id)["name"]
            dataset_populator.run_tool(
                "identifier_single",
                {"input1": {"batch": True, "values": [{"src": "hdca", "id": hdca["id"]}]}},
                history_id,
            )
            dataset_populator.wait_for_history(history_id, assert_ok=True)
            plain = dataset_populator.run_tool_raw(
                "identifier_single", {"input1": {"src": "hda", "id": hda_id}}, history_id, use_cached_job=True
            ).json()
            dataset_populator.wait_for_history(history_id, assert_ok=True)
            content = dataset_populator.get_history_dataset_content(history_id, dataset_id=plain["outputs"][0]["id"])
        assert content.startswith(f"identifier {hda_name}\n")
        # Fails: 'identifier sample_a\n...'; job has copied_from_job_id set.
```
</details>

## Cause

`JobSearch` in `lib/galaxy/managers/jobs.py`:
- `_build_stmt_for_hda` adds a `{k}|__identifier__` condition only when the request has an identifier. Otherwise it requires a dataset-name match (`require_name_match`), which is always true when the cached job used the same dataset.
- When comparing parameters, the search skips `|__identifier__` keys ("taken care of ... above"), and the parameter-count check excludes them too.
- So nothing stops a request without an identifier from matching a job that recorded one.

The reverse direction is already guarded: a mapped request requires a matching `|__identifier__` on the cached job.

## Suggested fix

For an input with no identifier in the request, also require that the cached job has no `{k}|__identifier__` parameter (a `NOT EXISTS` on `JobParameter`, or an outer join plus `IS NULL`). This only adds cache misses, never wrong hits. Add an API test along the lines of the repro above, in `test_jobs.py` next to `test_search_handle_identifiers`.

## Related

- User-defined tools make this easier to hit once mapped-over runs get their identifiers (see `udt_element_identifier_null_on_map_over`). A plain UDT run gives `null`, so any cache reuse of a mapped job is wrong, even when the dataset name equals the identifier. That was reproduced on branch `jmchilton/udt_element_identifier_api_test`.
- XML tools are affected only when the dataset name differs from the element identifier. That's typical for collections built from existing datasets; pasted or uploaded elements are usually named after their identifiers.
