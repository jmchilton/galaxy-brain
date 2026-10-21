# `type_source` output collections can get a different type than the input the tool received

When a collection input accepts several collection types, a `<collection type_source="...">` output can be created with a collection type other than the one actually bound to that input.

| Run | Input bound | Input declares | Output Galaxy creates | Expected |
| --- | --- | --- | --- | --- |
| Directly (no map-over) | `list:list` | `list,list:list` | ❌ `list` | `list:list` |
| Mapped over `paired` | `list:paired` | `paired_or_unpaired` | ❌ outer `list:paired`, each element `paired_or_unpaired` | outer and elements agree |

Both rows were reproduced with API tests against `dev` (`2cca8565861`), using two throwaway test tools (below). In the first row the job receives a `list:list`, but its output collection is created as a `list`. In the second, the implicit collection claims `list:paired` elements while each element is a `paired_or_unpaired`.

On `dev` the workflow editor uses a third rule. It picks the first declared type, in declaration order, that accepts the connected type or that the connected type can map over, and shows that declared type. So a `list:paired` connected to an input declaring `list:paired_or_unpaired` shows as `list:paired_or_unpaired` in the editor, while a direct run creates `list:paired` (server `can_map_over` rejects that pair, so `create_collection` falls back to the HDCA's type). Found by reading the client and server code; not reproduced in the editor.

No tool shipped with Galaxy hits this today: every in-tree `type_source` input declares no type, one type, or types none of which can map over another (table below). Any tool whose declared types overlap this way is affected, and #24303's `type_prefix` builds on the same resolution.

<details><summary>Reproduction</summary>

Test tools (added to `test/functional/tools/sample_tool_conf.xml`):

```xml
<tool id="zz_type_source_list_or_nested" name="zz_type_source_list_or_nested" version="0.1.0" profile="24.0">
  <command><![CDATA[
    mkdir output &&
    #for $key in $input_collect.keys()#
      echo "$key" > "output/${key}.txt";
    #end for#
    true
  ]]></command>
  <inputs>
    <param name="input_collect" type="data_collection" collection_type="list,list:list" label="Input" />
  </inputs>
  <outputs>
    <collection name="output" type_source="input_collect" label="out">
      <discover_datasets pattern="__name_and_ext__" directory="output" />
    </collection>
  </outputs>
</tool>
```

The second tool is the same, with `collection_type="paired_or_unpaired"`.

API test outline (`DatasetCollectionPopulator`):

- Row 1: `create_list_of_list_in_history`, then run `zz_type_source_list_or_nested` with `{"input_collect": {"src": "hdca", "id": ...}}`. The `output_collections[0].collection_type` in the response is `list`.
- Row 2: `create_list_of_pairs_in_history`, wait for the fetch, then run `zz_type_source_paired_or_unpaired` with `{"input_collect": {"batch": true, "values": [{"src": "hdca", "id": ..., "map_over_type": "paired"}]}}`. The implicit collection is `list:paired`, and its element `test0` is a `paired_or_unpaired` collection.

</details>

<details><summary>Where each rule lives</summary>

- **Direct run.** `OutputCollections.create_collection` (`lib/galaxy/tools/actions/__init__.py:1215-1238`) calls `HistoryQuery.can_map_over(hdca)` first and only falls back to the HDCA's own type when that returns nothing. `can_map_over` (`lib/galaxy/model/dataset_collections/query.py:69-81`) returns the first declared type, highest dimension first, that the HDCA can map over. A `list:list` can map over `list`, so a direct `list:list` gets `list`. Elsewhere Galaxy checks `direct_match` first: the tool form offers direct and multirun options separately, and workflow scheduling checks `direct_match` before mapping (`lib/galaxy/workflow/map_over.py:86`).
- **Mapped run, outer structure.** `tool_output_to_structure` (`lib/galaxy/model/dataset_collections/structure.py:214-217`) uses the sliced input's subcollection type, the concrete type chosen for the map-over (`paired`). Each job then runs `create_collection`, where the input is a DCE whose `.collection` is the parent `list:paired`; `can_map_over` on that parent returns the declared type (`paired_or_unpaired`).
- **Workflow editor.** `OutputCollectionTerminal.getCollectionTypeFromInput` (`client/src/components/Workflow/Editor/modules/terminals.ts:829-880`) takes the first matching declared type in declaration order, not rank order, and returns the declared type even on a direct match. It returns the connected type only for `any`. `list:paired_or_unpaired` accepts `list:paired` (`collectionTypeDescription.ts` `accepts`), so that declared type wins.

</details>

<details><summary>In-tree <code>type_source</code> tools</summary>

| Declares | Tools |
| --- | --- |
| `list,list:paired` | filter_empty, filter_failed, filter_null, keep_success (all versions), harmonize_two_collections_list, sort_collection_list |
| no `collection_type` | filter_from_file, relabel_from_file, tag_collection_from_file, merge_collection |
| `sample_sheet` variants | convert_sample_sheet |

A `list:paired` can't map over `list`, and a `list` can't map over `list:paired`, so for these tools `can_map_over` never returns a type on a direct match. With no declared type, `can_map_over` returns nothing and the HDCA's own type is used. The `sample_sheet` variants don't map over each other either.

</details>

## Context

Bug discovered while working on 🌿 [`issue_24303_collection_type_prefix_26.2`](https://github.com/jmchilton/galaxy/tree/issue_24303_collection_type_prefix_26.2), which implements 🎯 #24303 (`type_prefix` on `type_source` outputs) and inherits this resolution. That branch already fixes a related subworkflow-export problem, where a mapped `type_source` output got the map-over prepended to the full upstream type. Adjacent `type_source` work: 🎯 #23886 (crashes for inputs in conditionals) and 🎯 #23444 (nested parameter references). Overlaps 🔀 #24227 (open, `release_26.0`), which rewrites the editor's `getCollectionTypeFromInput` to follow the server's current order (map-over first, then the connected type on a direct match). That fixes the editor's `list:paired` → `list:paired_or_unpaired` case but copies the map-over-first rule this issue reports, so `list:list` into `list,list:list` would show `list` there too.

## Proposed Approach

Give a `type_source` output the type of the collection each job actually receives: the bound HDCA's own type on a direct run, the sliced subcollection's type when mapped over. That is already what `tool_output_to_structure` computes for the mapped case, so the fix is mostly in `create_collection`; put both behind one server helper (the #24303 branch adds a shared prefix helper at those two sites, which is the natural place), and make the editor follow the same rule, building on #24227.

<details><summary>Details</summary>

- **Direct run.** In `create_collection`, when the input is an HDCA that `direct_match`es, use its own type before trying `can_map_over`.
- **Mapped run.** Don't just call `direct_match` first for a DCE: its `.collection` is the parent, so a `list:list` mapped over `list` into `list,list:list` would look like a direct match and get `list:list`. Branch on HDCA vs DCE and use the DCE's child collection type (`paired` in row 2), matching the outer structure. If the element is a dataset (e.g. a `list:list` mapped into `paired_or_unpaired`, which consumes datasets), there is no child collection; keep today's declared type there.
- **Editor.** On a direct match return the connected type; when mapping over, return the subcollection type the connection maps over, not the declared type. Rank declared types the way the server does. This flips one #24227 assertion: `list:list` mapped into `list:paired_or_unpaired` would show `list:list` (each job gets a `list`), not `list:paired_or_unpaired`.
- **Tests (red first):**
  - API: the two reproductions above, as permanent test tools.
  - Unit: `tool_output_to_structure` and `create_collection` agree for a `paired_or_unpaired` input mapped over `list:paired`.
  - Vitest `terminals.test.ts`: declared order (`list,list:list` vs `list:list,list`) and `list:list` direct into `list,list:list` (#24227 already covers direct `list:paired` into `list:paired_or_unpaired`).
- The in-tree tool audit above suggests no behavior change for shipped tools; their existing tests should stay green.

</details>

## Alternative Approaches

We could instead document that declared collection types must not overlap by map-over, and lint for it. That avoids touching resolution, but it bans reasonable declarations like `list,list:list` and doesn't touch row 2, where a single declared type (`paired_or_unpaired`) already makes the implicit collection and its elements disagree. Fixing the rule is small and makes every consumer agree.

<details><summary>Alternatives In Detail</summary>

### Alternative: Lint overlapping declarations

<details><summary>Description</summary>

#### Details

Add a tool linter that warns when a `type_source` input declares types where one can map over another, and document that such tools get the lower-dimension type.

#### Why the proposed approach is preferred

`list,list:list` is a legitimate input declaration (the tool form already offers both direct and multirun choices for it). The lint wouldn't catch row 2, which has one declared type and no overlap.

</details>

### Alternative: Prefer the declared type everywhere

<details><summary>Description</summary>

#### Details

Make the runtime always report the matching declared type, as the editor does, rather than the bound collection's type.

#### Why the proposed approach is preferred

The job receives the bound collection. An output that claims `list:paired_or_unpaired` while the tool saw `list:paired` describes data the tool never got, and downstream steps check connections against the claimed type.

</details>

</details>
