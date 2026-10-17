# Tool form drag and drop matches collections to inputs by plain string suffix

When a collection is dropped on a tool form collection input, the client matches it by plain string suffix. It refuses some drops the server would list, accepts drops that fail when submitted, and picks the wrong map-over in other cases.

Both checks in `FormData.vue` work like this. The drop guard is `collectionType.endsWith(element)`, and the map-over picker is `collectionTypes.find((t) => itemCollectionType.endsWith(t))`. The suffix has no `:` boundary, and neither check knows the `paired_or_unpaired` or `sample_sheet` rules. The server's option listing (`HistoryQuery.direct_match` / `can_map_over`) does know them.

| Input `collection_type` | Dropped | Server (option listing / run) | Client drop on `dev` |
| --- | --- | --- | --- |
| `paired_or_unpaired` | `paired` HDCA | listed, used directly | refused ❌ |
| `list:paired_or_unpaired` | `list` or `list:paired` HDCA | listed, used directly | refused ❌ |
| `paired_or_unpaired` | `list` / `list:paired` HDCA | listed, mapped over (single datasets / `paired`) | refused ❌ |
| `list` | `sample_sheet` HDCA ¹ | listed, used directly | refused ❌ |
| `paired` | `list:paired_or_unpaired` or `paired_or_unpaired` HDCA | not listed ¹; run fails: "Cannot split collection in desired fashion." | accepted, mapped over `paired` ❌ |
| `list,list:list` ² | `list:list:list` HDCA | mapped over `list:list`: one job per inner `list:list` | mapped over `list`: one job per innermost list ❌ |
| `list` | element of a `list:list:list` (a `list:list`) | element map-over is supported, as for an HDCA | sent with `batch: false`: one job, `list:list` bound to a `list` input ❌ |

❌ = client differs from server. ¹ 26.0 and later. On 25.1 the server has no `sample_sheet` normalization, and its own listing has the same suffix bug, so it lists `list:paired_or_unpaired` for `paired`. The run fails on 25.1 too. ² Only when a shallower type is declared before a deeper one that ends with it. The test tool `collection_list_or_nested_list_input` does this; no shipped tool in Galaxy or tools-iuc was found that does.

The client column comes from mounting `dev`'s `FormData.vue` in vitest and dropping each item; the server column from `type_description.py` / `HistoryQuery` and the API test cited below.

The refused rows are the worst for users. The collection is in the dropdown, but dragging it in shows "… dataset collection is not a valid input for … type dataset collection parameter." The other rows submit something other than what the dropdown would have offered, with no warning.

Affects `release_25.1` through `dev`. The two checks are unchanged on every branch: `toDataOption` and `canAcceptSrc` in `client/src/components/Form/Elements/FormData/FormData.vue` (`dev` L617 and L896).

<details><summary>Why each row happens</summary>

- **Missing `:` boundary.** `"list:paired_or_unpaired".endsWith("paired")` is true, so the drop is accepted and `map_over_type: "paired"` is sent. The server's `_split_dataset_collection` then reaches the `paired_or_unpaired` level, finds datasets where it expects pairs, and raises. `test_tool_execute.py::test_paired_or_unpaired_not_consumed_by_paired_when_mapping` asserts exactly this failure. The server's listing got the `:` boundary in #22170 (backported to 26.0 in #22193). The client checks never got it.
- **`paired_or_unpaired` rules.** The server's `accepts` takes `paired` for `paired_or_unpaired`, and `list` or `list:paired` for `list:paired_or_unpaired`. Its `can_map_over` maps anything but a bare pair over `paired_or_unpaired`. None of these are string suffixes.
- **`sample_sheet`.** The server normalizes `sample_sheet` to `list` before matching. The client compares raw strings.
- **Declaration order.** `HistoryQuery.from_collection_types` sorts input types deepest first, so map-over gives each job as much data as possible. The client's `find` takes the first declared type that matches.
- **Collection elements.** `toDataOption` sets `map_over_type` only for `isHistoryItem(v) && isHDCA(v)`. A dropped element that holds a collection passes `canAcceptSrc` through `endsWith`, then goes out with `batch: false` and no `map_over_type`. `DataCollectionToolParameter.from_json` uses it as is, with no collection-type check. The server's `__expand_collection_parameter` does map over a `dce` with a `map_over_type`; the client just never sends one.

</details>

## Context

Bug found while working on processing-mode hints for 🎯 #20657 and 🎯 #19234 on 🌿 [`issue_20657_input_processing_mode`](https://github.com/jmchilton/galaxy/tree/issue_20657_input_processing_mode). A follow-up to 🔀 #18623, which added the suffix check to drop validation, and to 🔀 #22170, which fixed the same suffix bug in the server's listing. Related to 🎯 #20315 / 🔀 #19900, which fixed map-over of dropped collection elements on `data` inputs; this issue is the `data_collection` side. Related to 🎯 #21271 (`paired_or_unpaired` usability) and to 🎯 #24218: the client's `CollectionTypeDescription.canMapOver` disagrees with the server for `X:paired_or_unpaired` inputs.

## Proposed Approach

Replace both suffix checks with one helper built on the client's existing `CollectionTypeDescription` (`client/src/components/Workflow/Editor/modules/collectionTypeDescription.ts`). The workflow editor already uses it, and the server's `type_description.py` says its `accepts` / `canMapOver` must stay in sync with the Python ones. The helper uses `accepts` for a direct match. Otherwise it maps over the deepest input type the item `canMapOver`, with the server's `paired_or_unpaired` → `paired` / single-datasets adjustment. Drop validation and `toDataOption` both call it, for HDCAs and for collection elements that hold a collection. Land the 🎯 #24218 `canMapOver` fix first or together: without it the helper would start accepting a `paired` drop on `list:paired_or_unpaired`, which `dev` correctly refuses today. This is implemented on 🌿 [`issue_20657_input_processing_mode`](https://github.com/jmchilton/galaxy/tree/issue_20657_input_processing_mode).

<details><summary>Approach details</summary>

- Commits:
  - [`9ff2eb69afd`](https://github.com/jmchilton/galaxy/commit/9ff2eb69afd) matches dropped collections the way the server does (`matchCollectionType`, now in `collectionMatch.ts`).
  - [`68b8d3969e5`](https://github.com/jmchilton/galaxy/commit/68b8d3969e5) maps over the deepest accepted type. It also carries option-dedupe changes that need splitting out.
  - [`057ac69f904`](https://github.com/jmchilton/galaxy/commit/057ac69f904) handles dropped collection elements.
  - Baseline tests are in [`b89794a9f36`](https://github.com/jmchilton/galaxy/commit/b89794a9f36), including `paired` refused on `list:paired_or_unpaired`.
- Red-first tests:
  - `FormData.test.ts`: `list:paired_or_unpaired` dropped on `paired` is refused.
  - `FormData.test.ts`: `list` / `list:paired` dropped on `paired_or_unpaired` is accepted, with the server's `map_over_type`.
  - `FormData.test.ts`: a `list:list` element dropped on `list` emits `{batch: true, values: [{src: "dce", map_over_type: "list"}]}`.
  - `FormData.mapOver.test.ts`: `list:list:list` dropped on `list,list:list` maps over `list:list`.
  - Still to add: `paired` on `paired_or_unpaired` and `list` / `list:paired` on `list:paired_or_unpaired` accepted directly; `sample_sheet` on `list` accepted.
- Backport target: `release_26.0`, together with the 🎯 #24218 `canMapOver` fix. 26.0 has the server's `:` boundary (🔀 #22193), so the fixed client agrees with the dropdown there. 25.1 isn't targeted: its listing still has the suffix bug, so a fixed client would refuse `list:paired_or_unpaired` on `paired` while the 25.1 dropdown still offers it.

</details>

## Alternative Approaches

The smallest fix adds a `:` boundary to the two `endsWith` calls. That fixes only the accepted-then-fails row. The refused `paired_or_unpaired` and `sample_sheet` rows, the declaration-order row and the collection-element row would all remain. A second option asks the server, by checking the dropped item against the input's listed options. A dropped item may not be on the loaded page of options, and collection elements are never listed, so the client needs its own rule. The workflow editor already has one that mirrors the server.

<details><summary>Alternatives In Detail</summary>

### Alternative: Add a `:` boundary to the suffix checks

<details><summary>Description</summary>

#### Details

Change both checks to `t === item || item.endsWith(":" + t)`.

#### Why the proposed approach is preferred

It fixes one of seven rows. Each remaining rule (`paired_or_unpaired` direct and map-over matches, `sample_sheet` normalization, deepest-first) would need its own special case in `FormData.vue`. That copies `CollectionTypeDescription`, which already exists and is kept in sync with the server.

</details>

### Alternative: Match drops against the server's listed options

<details><summary>Description</summary>

#### Details

Accept a drop only when `props.options.hdca` has an entry for the item, and take its `map_over_type` from that entry.

#### Why the proposed approach is preferred

Options are paged, so a valid collection outside the loaded page would be refused. Collection elements never appear in the listing. The client-side rule is still needed, and the listing can stay a cross-check.

</details>

</details>
