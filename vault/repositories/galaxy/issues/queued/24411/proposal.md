# Job cache reuses a mapped-over job for a plain run, returning the wrong `element_identifier`

With `use_cached_job`, running a tool directly on a dataset can reuse an earlier job that ran on that dataset as a collection element, so an output built from `element_identifier` carries the element's identifier instead of the dataset name.

Using the stock `identifier_single` test tool on dev 51e0a80a0db:

| Step | Job | Output |
| --- | --- | --- |
| 1. Make a list from an existing dataset `Test_Dataset`, element identifier `sample_a` | | |
| 2. Run `identifier_single` mapped over the list | new | `identifier sample_a` |
| 3. Run `identifier_single` on `Test_Dataset` directly, `use_cached_job=True` | cache copy (`copied_from_job_id` set) ❌ | `identifier sample_a` ❌ |
| Expected for step 3 | new run, or a hit only on a plain job | `identifier Test_Dataset` |

For a plain dataset, `$input1.element_identifier` falls back to the dataset name (`DatasetFilenameWrapper.element_identifier`, `tools/wrappers.py`). The reverse direction is already guarded: a mapped request requires a matching `|__identifier__` on the cached job.

XML tools are affected only when the dataset name differs from the element identifier, which is typical for collections built from existing datasets. User-defined tools are affected whenever their command line uses `element_identifier`: once #24410 is fixed, mapped runs get the identifier while a plain run renders `null`, so reusing any mapped job is wrong.

<details><summary>Reproduction (API test, fails on dev)</summary>

```python
def test_cached_job_plain_run_skips_mapped_job(self, history_id):
    # A plain run must not reuse a mapped job's output, which carries the element identifier.
    hdca = self.dataset_collection_populator.create_list_in_history(
        history_id, contents=[("sample_a", "a\n")], direct_upload=False, wait=True
    ).json()
    element = self.dataset_populator.get_history_collection_details(history_id, content_id=hdca["id"])["elements"][0]
    hda_id = element["object"]["id"]
    hda_name = self.dataset_populator.get_history_dataset_details(history_id, dataset_id=hda_id)["name"]
    self.dataset_populator.run_tool(
        "identifier_single",
        {"input1": {"batch": True, "values": [{"src": "hdca", "id": hdca["id"]}]}},
        history_id,
    )
    self.dataset_populator.wait_for_history(history_id, assert_ok=True)
    plain = self.dataset_populator.run_tool(
        "identifier_single", {"input1": {"src": "hda", "id": hda_id}}, history_id, use_cached_job=True
    )
    self.dataset_populator.wait_for_history(history_id, assert_ok=True)
    content = self.dataset_populator.get_history_dataset_content(history_id, dataset_id=plain["outputs"][0]["id"])
    assert content.startswith(f"identifier {hda_name}\n")  # dev: 'identifier sample_a\n'
```

</details>

<details><summary>Cause</summary>

`JobSearch` in `lib/galaxy/managers/jobs.py`:

- `_build_stmt_for_hda` adds a `{k}|__identifier__` condition only when the request has an identifier. Otherwise it requires a dataset-name match (`require_name_match`), which always holds when the cached job used the same dataset.
- When comparing parameters, the search skips `|__identifier__` keys ("taken care of ... above"), and the parameter-count check excludes them too.
- So nothing stops a request without an identifier from matching a job that recorded one.

</details>

## Context

Found while fixing #24410 on 🌿 [`udt_element_identifier_api_test`](https://github.com/jmchilton/galaxy/tree/udt_element_identifier_api_test). The problem itself predates that work and reproduces with XML tools on dev.

## Proposed Approach

When an input in the request has no identifier, also require that the cached job has no `{k}|__identifier__` parameter for it, via a `NOT EXISTS` on `JobParameter` or an outer join with `IS NULL`. It only adds misses, never wrong hits; tools that ignore `element_identifier` lose this rare hit too. Add the API test above to `test_jobs.py` next to `test_search_handle_identifiers`.

## Alternative Approaches

The search could instead accept a mapped job for a plain request when the element identifier equals the dataset name, since an XML tool's output would be the same. That keeps a few more cache hits, but it's still wrong for user-defined tools, where a plain run renders `null`, and it ties cache matching to how a tool reads `element_identifier`. Requiring no identifier is simpler and always safe.

<details><summary>Alternatives In Detail</summary>

### Alternative: Allow the hit when identifier equals dataset name

<details><summary>Description</summary>

#### Details

For a plain request, match a cached job whose `{k}|__identifier__` equals the input dataset's name, or that has no identifier.

#### Why the proposed approach is preferred

The equality holds only for XML tools' fallback behavior. User-defined tools render a different value for plain inputs, so the cache would still return wrong output for them. The extra hits are rare, because a plain run after a mapped run of the same tool on the same dataset is uncommon.

</details>

</details>
