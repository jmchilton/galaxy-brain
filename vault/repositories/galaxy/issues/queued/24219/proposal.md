# Tool form drops a selected collection that isn't on the first option page when the form refreshes

If you pick a collection that is past the first page of a tool form's options (found with Load more or search), the next form refresh quietly switches the input to the newest collection.

The build response (`POST /api/tools/{id}/build`) has a `pinned` list so that selected items outside the page window still render. Only some selections get there:

| Selected item, outside the page window | `data` input | `data_collection` input |
| --- | --- | --- |
| Dataset in this history | pinned ✅ | n/a |
| Collection that is hidden, deleted or from another history | carried ✅ | carried ✅ (26.2+) |
| Visible collection in this history | dropped ❌ | dropped ❌ |

✅ the build response includes it, so the client keeps the selection. ❌ it is in neither `options` nor `pinned`, so the client selects the first option.

With the page size forced to 1 and two list collections in a history, asking `build` to keep the older one selected returns:

| Input | `options.hdca` | `pinned.hdca` |
| --- | --- | --- |
| `__FILTER_EMPTY_DATASETS__` `input` (`data_collection`) | newer only | `[]` |
| `cat1` `input1` (`data`, batch over the collection) | newer only | `[]` |

Refreshes are common. The form rebuilds when anything in the history changes (an upload, a job finishing in the background) and when a `refresh_on_change` parameter is edited. The page window is 50 options, so a history needs more than 50 matching collections for this to happen. Nothing tells the user, and the tool runs on a different collection.

<details><summary>Steps to reproduce (UI, worked out from the code, not yet run)</summary>

1. In one history, make 51 or more list collections. Give the oldest one a distinctive name, e.g. `the-one-i-want`.
2. Open a tool with a `data_collection` input that accepts `list`, e.g. "Filter empty datasets" (`__FILTER_EMPTY_DATASETS__`).
3. In the collection dropdown, search for `the-one-i-want` (or press Load more until it shows up) and select it.
4. Upload any dataset to the history, or wait for a running job to finish.
5. The dropdown now shows the newest collection, not `the-one-i-want`. Run the tool and the job uses the newest collection.

The same thing happens with a `data` input in collection ("Dataset collection") mode, e.g. `cat1`.

</details>

<details><summary>Why</summary>

On refresh, `ToolForm.vue` `onUpdate()` posts the current values without `options_pagination` and replaces the form with the response (`formConfig.value = data`). The server only returns the default first page.

On the server, the selected value reaches `to_dict` as the HDCA. `from_json` unwraps the client's `{"values": [{"src": "hdca", "id": ...}]}` through `to_python` ([basic.py#L2330](https://github.com/galaxyproject/galaxy/blob/7c86d742327b4a0da69f02c8e76633371d89a11b/lib/galaxy/tools/parameters/basic.py#L2330)). `populate_model` then passes it in as `other_values[name]`. Neither parameter pins it when it isn't on the page:

- `DataToolParameter._pin_live_hda_inputs` pins only `HistoryDatasetAssociation` values ([L2900](https://github.com/galaxyproject/galaxy/blob/7c86d742327b4a0da69f02c8e76633371d89a11b/lib/galaxy/tools/parameters/basic.py#L2900)). An HDCA falls through to `_carry_unresolved_inputs`, which keeps it only when `value.deleted or not value.visible or value.history != history` ([L2938](https://github.com/galaxyproject/galaxy/blob/7c86d742327b4a0da69f02c8e76633371d89a11b/lib/galaxy/tools/parameters/basic.py#L2938)).
- `DataCollectionToolParameter._carry_selected_hdca` has the same condition ([L3161](https://github.com/galaxyproject/galaxy/blob/7c86d742327b4a0da69f02c8e76633371d89a11b/lib/galaxy/tools/parameters/basic.py#L3161)).

On the client, `FormData.vue`'s `currentValue` looks for the value among `options` + `pinned` + its keep-option cache. When it finds nothing, it returns `formattedOptions[0]` for a required single input ([FormData.vue#L187](https://github.com/galaxyproject/galaxy/blob/7c86d742327b4a0da69f02c8e76633371d89a11b/client/src/components/Form/Elements/FormData/FormData.vue#L187)). The `props.options` watcher then emits that as the new value ([L1090](https://github.com/galaxyproject/galaxy/blob/7c86d742327b4a0da69f02c8e76633371d89a11b/client/src/components/Form/Elements/FormData/FormData.vue#L1090)). An option picked from the dropdown is a plain page entry, so it isn't in the keep-option cache (a drag-and-drop selection is).

</details>

<details><summary>Failing API test</summary>

Modeled on `test_build_data_options_pinned_outside_page` in `lib/galaxy_test/api/test_tools.py`. `limit: 1` means two collections are enough. Run against a branch whose tool-parameter and form code matches `dev`: the page assertions pass for both inputs, and the `pinned` assertion fails for both.

```python
def _build_hdca_page_of_one(self, tool_id, name, value, history_id):
    payload = {
        "history_id": history_id,
        "inputs": {name: value},
        "options_pagination": {name: {"hdca": {"limit": 1}}},
    }
    response = self.dataset_populator._post(f"tools/{tool_id}/build", data=payload, json=True)
    response.raise_for_status()
    param = next(i for i in response.json()["inputs"] if i["name"] == name)
    return {e["id"] for e in param["options"]["hdca"]}, {e["id"] for e in param["pinned"]["hdca"]}

@skip_without_tool("__FILTER_EMPTY_DATASETS__")
@skip_without_tool("cat1")
def test_build_collection_options_pinned_outside_page(self):
    with self.dataset_populator.test_history() as history_id:
        older = self.dataset_collection_populator.create_list_in_history(history_id, wait=True).json()["outputs"][0]
        newer = self.dataset_collection_populator.create_list_in_history(history_id, wait=True).json()["outputs"][0]
        ref = {"src": "hdca", "id": older["id"]}
        for tool_id, name, value in [
            ("__FILTER_EMPTY_DATASETS__", "input", {"values": [ref]}),
            ("cat1", "input1", {"batch": True, "values": [ref]}),
        ]:
            page, pinned = self._build_hdca_page_of_one(tool_id, name, value, history_id)
            assert newer["id"] in page and older["id"] not in page
            assert older["id"] in pinned  # fails: pinned["hdca"] == []
```

</details>

## Context

Bug found while working on 🌿 [`issue_20657_input_processing_mode`](https://github.com/jmchilton/galaxy/tree/issue_20657_input_processing_mode) (🎯 #20657). 🔀 #22643 (26.1) added `pinned` "so selected values that fall outside the page window still render", but it only filled `pinned["hda"]`. 🔀 #23865 (26.2) added the hidden, deleted and foreign-history carry for collections, but not for visible ones off the page. The same code is on 26.1, 26.2 and `dev` (26.1 also lacks the hidden, deleted and foreign carry for `data_collection`). 26.0 has no option paging. Sibling issue 🎯 #24221 covers paging splitting one collection's direct and map-over entries.

## Proposed Approach

Pin a live selected HDCA the same way a live selected HDA is pinned. If the value is a visible HDCA in this history that matches the parameter but isn't on the returned page, the server adds its entries to `pinned["hdca"]`. The `data` path should do it in `DataToolParameter` before `_carry_unresolved_inputs`. The `data_collection` path should do it in `_carry_selected_hdca`. Both should go through one shared helper. The client already merges `pinned` into the select.

<details><summary>Approach details</summary>

- Entry shape: reuse each parameter's existing classifier, so a pinned entry looks exactly like the page entry it replaces. For `data_collection` that is `_classify_hdca`, which gives the direct and/or map-over entries. For `data` it is the `hdca_filter` logic in `_page_hdca_matches`, which gives `subcollection_type` for `multiple` inputs. Skip the pin if the HDCA is already on the page.
- `keep`: pinned HDAs use `keep=True`. The client keys keep-options by `id_src`, so a collection that is both a direct and a map-over match would collapse to one entry there. Pinning collections without `keep`, or pinning only the selected kind, avoids that.
- Out of scope: the refresh payload loses `map_over_type` (`to_python` returns a bare HDCA), and `FormData` matches values on `id` + `src` only. So the server can't tell which of a collection's two entries the user picked. That is part of the #20657 work, not this bug.
- Tests: the failing API test above, for both parameter types. Optionally, a `FormData` vitest showing that a value present only in `pinned.hdca` stays selected after the `options` prop changes.
- Backport: on 26.1 the `data_collection` path has no `_carry_selected_hdca`, so the pin goes straight into `to_dict` there.

</details>

## Alternative Approaches

The client could remember the selected option and re-insert it after `formConfig.value = data`, or refreshes could re-request every page already loaded. Pinning on the server is preferred. It matches how #22643 already handles datasets, it works for every build caller (rerun, workflow run form, reload), and it keeps the response bounded.

<details><summary>Alternatives In Detail</summary>

### Alternative: Keep the selection on the client across refreshes

<details><summary>Description</summary>

#### Details

Before replacing `formConfig`, `ToolForm.onUpdate` (and the workflow run form equivalent) could copy the currently selected `DataOption`s into the new input's options, or into `FormData`'s keep-options cache.

#### Why the proposed approach is preferred

It fixes only one client path, and only for the open page. A rerun, or a reload with saved values, still loses the selection. It also adds a second, client-only way to keep a selection next to `pinned`, which already exists for this purpose.

</details>

### Alternative: Re-request all loaded pages on refresh

<details><summary>Description</summary>

#### Details

`onUpdate` could send `options_pagination` with `limit` equal to the number of options already loaded (or the search that found the selection).

#### Why the proposed approach is preferred

It brings back the large payloads that pagination was added to avoid, it is capped at the 500 maximum, and it does nothing for a selection found by search.

</details>

</details>
