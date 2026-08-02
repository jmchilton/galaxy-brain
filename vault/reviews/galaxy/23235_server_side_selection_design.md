# Server-side selection for the collection panel

Design note. Not a change request against PR 23235 — everything here is out of scope for
that PR and should not be asked of its author. This is the shape the feature wants once
the client work lands.

All citations are against the `review-23235-judo-prototype` worktree (PR 23235 head + 9
client commits). Where a claim is inference rather than a read, it says "inferred".
Bare `SelectionOperations.vue` below is
`client/src/components/History/CurrentHistory/HistoryOperations/SelectionOperations.vue`.

## 1. The problem, stated precisely

`collectionElementsStore` seeds one placeholder per element from `element_count` and
fetches 50 at a time (`client/src/stores/collectionElementsStore.ts:34`, `:170-181`). The
panel's selection can only hold elements that have been fetched — `selectableDatasets`
filters the store's entries down to fetched dataset elements
(`client/src/components/History/CurrentCollection/CollectionPanel.vue:100-105`). So
Ctrl+A on a 120-element collection reaches 100; shift-click across a gap sweeps 22 rows
and selects 2.

The branch's remedy is to report the shortfall: `unloadedElementCount`
(`CollectionPanel.vue:110`) is surfaced as "N not loaded" in the operations bar
(`CollectionOperations.vue:116-121`). That is honest, and it is a palliative.

The history panel's fix for the same class of problem is query selection: hold a filter
instead of a list of ids, dispatch to the server
(`client/src/composables/selectedItems/selectedItems.ts:37-48`). The collection panel
passes no `querySelection` (`CollectionPanel.vue:131-133`) because there is nothing behind
it.

## 2. Prerequisite: the client restructure is the floor, not a competitor

Three pieces of the branch are load-bearing for anything server-side. None of this is
superseded by the design below.

**One object identity per row.** `itemUniqueKey`
(`client/src/components/History/Content/model/itemKey.ts:11`) gives every `ContentItem`
listing the same key function, and the collection panel selects `element.object` (the
`CollectionElementDataset`), not the DCE wrapper (`CollectionPanel.vue:100-105`, `:126`).
Why it is a precondition: any server-side subset has to be *reconciled* against what the
client has rendered — the "select all then deselect three" case needs a stable identity
for the three, and the range-select maths in `selectedItems.ts:188-226` indexes into
`allItems` by object identity. Two identities per row (DCE and HDA) makes "which three did
you deselect" ambiguous at exactly the moment it matters.

**Normalized element datasets at the fetch boundary.** `normalizeCollectionElements`
(`client/src/api/index.ts:258-272`) fills `name` and `history_content_type` before elements
reach the store, and explicitly before they are made reactive. Why it is a precondition:
without it the panel's selected items are not `HistoryItemSummary`-shaped, and every
downstream consumer — the creator modal, a future operations payload builder — has to
re-derive the shape. A server-side path adds *more* consumers of that shape, not fewer.

**`querySelection` as an optional grouped parameter.**
`client/src/composables/selectedItems/types.d.ts:1-21`, `:33`. Why it is a precondition:
it establishes the seam. Today the collection panel omits the group and the composable
correctly reports the true selection size (`selectedItems.ts:37-45`). When the server
gains the capability, the panel supplies the group and nothing else in the composable
changes. Four always-required arguments would have forced the collection panel to pass
stubs, and a stubbed `filterClass` would have made `isSelected` lie
(`selectedItems.ts:76-82`).

## 3. What exists server-side today

### 3.1 The element-identifier creation path

`POST /api/dataset_collections` (`lib/galaxy/webapps/galaxy/api/dataset_collections.py:83-92`)
takes `CreateNewCollectionPayload` (`lib/galaxy/schema/schema.py:1825`). Its only source of
content is `element_identifiers: list[CollectionElementIdentifier]`
(`schema.py:1796`, `:1827-1832`). There is no "source: this HDCA" variant.

`DatasetCollectionManager.create_dataset_collection`
(`lib/galaxy/managers/collections.py:356`) asserts exactly one of `element_identifiers` /
`elements` is set and raises `ERROR_INVALID_ELEMENTS_SPECIFICATION`
(`collections.py:64`, `:370-372`) if neither is. `elements` is the internal, already-loaded
path used by tools; `element_identifiers` is the API path.

`__load_element` (`collections.py:729-789`) resolves a single identifier. Sources:

- `hda` (`:766`) — `hda_manager.get_accessible`, then `copy` if `copy_elements`, and
  `hda.visible = False` if `hide_source_items` **and** the user owns it.
- `ldda` (`:777`) — converted to an HDA in the target history.
- `hdca` (`:785`) — returns `__get_history_collection_instance(...).collection`, i.e. the
  whole collection becomes **one** element (a child collection). This is the nesting
  source, not an enumeration source. It is also the only branch with no copy and no
  ownership check beyond accessibility — the code says so itself: `# TODO: Option to copy?
  Force copy? Copy or allow if not owned?`.
- `new_collection` — handled a level up in `_element_identifiers_to_elements`
  (`collections.py:451-484`) via `__recursively_create_collections_for_identifiers`.

`copy_elements` defaults `True` on the API payload (`schema.py:1852-1856`) and `False` on
the manager (`collections.py:193`). `hide_source_items` defaults `False`
(`schema.py:1847-1851`).

**Where a collection-sourced build would hook in with least disturbance:** nowhere clean.
`__load_element` is per-identifier and returns one object; a subset of an HDCA is
inherently one-to-many. It would have to go in at
`_element_identifiers_to_elements`/`create_dataset_collection`, i.e. a second content
source alongside `element_identifiers` and `elements`, which is precisely the invariant the
assert at `collections.py:369` is protecting. See §5 for why that is the wrong place
anyway.

### 3.2 The query-selection precedent

`PUT /api/histories/{history_id}/contents/bulk`
(`lib/galaxy/webapps/galaxy/api/history_contents.py:827-838`). The shape:

- **Filter transport is the URL query string, not the body.** `ValueFilterQueryParams`
  (`lib/galaxy/schema/__init__.py:21`) carries `q`/`qv` pairs; the client builds them with
  `filtersToQueryValues(HistoryFilters.getQueryDict(filterText))`
  (`client/src/components/History/model/queries.ts:69-86`,
  `SelectionOperations.vue:461-468`).
- **Body carries operation + optional explicit items.**
  `HistoryContentBulkOperationPayload` (`schema.py:1388-1391`): `operation`, `items`,
  `params`. `params` is a discriminated union on `type`
  (`schema.py:1366-1385`).
- **Server picks one or the other.** `HistoryContentsService.bulk_operation`
  (`lib/galaxy/webapps/galaxy/services/history_contents.py:729-754`): if `payload.items`,
  resolve them; else `history_contents_manager.contents(history, filters)`. Filters are
  parsed by `parse_query_filters` (`lib/galaxy/managers/base.py:1084-1087`) against
  `HistoryContentsFilters` (`lib/galaxy/managers/history_contents.py:596`).
- **Response is a count plus per-item errors.** `HistoryContentBulkOperationResult`
  (`schema.py:1399-1401`): `success_count`, `errors: list[BulkOperationItemError]`. Note
  `success_count = len(contents) - len(errors)` — the server tells the client how many
  items the query actually covered, which the client did not know.

**Can the collection case reuse it? No, and the reason is more interesting than "different
manager".** Two independent blockers:

1. There is no filter language over collection elements. `GET
   /api/dataset_collections/{hdca_id}/contents/{parent_id}`
   (`api/dataset_collections.py:202-227`) accepts `instance_type`, `limit`, `offset` and
   nothing else. `_get_collection_contents_qry` (`collections.py:1005-1017`) filters only
   on `dataset_collection_id` and orders by `element_index`. There is no `DCEFilters`
   analogue of `HistoryContentsFilters`. And the panel has no filter box, so there is no
   user-facing query to serialize either.
2. **The precedent does not actually cover collection building — even in the history
   panel.** `bulk` operations are `hide`/`delete`/`change_datatype`/`add_tags` etc.
   (`schema.py:1354-1364`). Building a list is not one of them. `showBuildOptions` is
   explicitly gated off during query selection (`SelectionOperations.vue:279-281`), and
   the "build for all matching" fallback `buildDatasetListAll`
   (`SelectionOperations.vue:479-483`) just hands `filterText` to `CollectionCreatorIndex`,
   which re-fetches the whole filtered history client-side
   (`client/src/components/Collections/CollectionCreatorIndex.vue:64-79`) and then posts
   `element_identifiers` like everyone else.

So: the gap is not collection-panel-specific. **Galaxy has no server-side "build a
collection from a query" anywhere.** Framing this as "the collection panel is behind the
history panel" is wrong; the history panel has the same hole, just further from the edge
because histories page at 100 and the creator modal tolerates a full re-fetch.

Corollary for item 4 of the brief: the honest phrase is **"select all elements"**, not
"select all matching". There is no query over collection elements and no UI that would
produce one.

### 3.3 Collection operation tools

`DatabaseOperationTool` (`lib/galaxy/tools/__init__.py:4029`) with
`ModelOperationToolAction` (`lib/galaxy/tools/actions/model_operations.py:41`). Registered
in `TOOL_CLASSES` (`tools/__init__.py:5237`) and dispatched by `tool_types`
(`:5257`); XML wired into `lib/galaxy/config/sample/tool_conf.xml.sample` (e.g. `:53`).

The relevant ones, and what each proves:

- `__FILTER_FROM_FILE__` / `FilterFromFileTool` (`tools/__init__.py:5103-5152`,
  `lib/galaxy/tools/filter_from_file_1.1.0.xml`) — **the closest existing thing to what we
  want.** Iterates `hdca.collection.elements` server-side, partitions on membership in a
  list of identifiers, copies each `element_object` (branching on `history_content_type` so
  sub-collections copy too, `:5123-5126`), preserves `dce.columns` /
  `column_definitions`, and emits two collections via `output_collections.create_collection`.
  The subset is expressed as **element identifiers read from a dataset**.
- `FilterDatasetsTool` (`:4487-4560`) — same machinery, predicate is dataset state.
  Asserts `collection_type in ("list", "list:paired", "sample_sheet",
  "sample_sheet:paired")` (`:4525`) and handles `list:paired` by testing all children of
  each sub-collection (`:4536-4544`). This is the existing answer to "what does a subset of
  a non-flat collection mean": the sub-collection is the unit.
- `__SORT_LIST__` / `SortTool` (`:4701-4757`) — reorders by identifier or by a file of
  identifiers; errors loudly if the file's lines do not match the element identifiers
  (`:4728-4732`).
- `__EXTRACT_DATASET__` (`lib/galaxy/tools/extract_dataset.xml`) — the only built-in that
  addresses an element **by index** (`:33-35`, an `integer` param) as well as by
  identifier (`:23-31`, with a hand-written `sanitizer`).
- `__BUILD_LIST__` / `BuildListCollectionTool` (`:4241-4268`) — builds from a `repeat` of
  individual datasets. Not applicable: the repeat is per-dataset, so it re-enumerates.
- `__APPLY_RULES__` / `ApplyRulesTool` (`:4988-5017`) → `manager.apply_rules`
  (`collections.py:823-839`). `__init_rule_data` (`:920-960`) flattens the collection into
  rows server-side and `_build_elements_from_rule_data` (`:841`) rebuilds. Filters exist in
  the DSL: `add_filter_matches` (`lib/galaxy/util/rules_dsl.py:408`), `add_filter_regex`
  (`:333`), `add_filter_count` (`:361`), `add_filter_compare` (`:434`).

**Why `__APPLY_RULES__` is a near miss and not the answer.** Two reasons, both concrete:

- Its filters are single-value or single-regex against one column. An arbitrary
  hand-picked subset of 40 identifiers is either 40 chained `add_filter_matches` rules or
  one `add_filter_regex` with a 40-way alternation of escaped identifiers. That is a
  hack, not a design.
- It cannot filter on index at all. `__init_rule_data` puts `indices` into `sources`
  (`collections.py:929`, `:944`) and never into `data`; the filter rules operate on `data`
  columns (`rules_dsl.py:408-431`). So index is invisible to every rule.

### 3.4 Job/UX cost of the tool route

`ModelOperationToolAction.produces_real_jobs = False`
(`actions/model_operations.py:42`) and `_produce_outputs` is called inline during
`execute` (`:119-121`). So these run in-request — no queue, no runner. But a `Job` row is
created (`_new_job_for_session`, `:119`) and the output collection lands as a new history
item with tool provenance and a new hid. That is a real difference from the direct build:
the result is reproducible, rerunnable, and usable in a workflow, at the cost of appearing
as a tool run rather than a bare list.

There is a precedent for firing a built-in tool from a UI button without showing the tool
form: `POST /api/tools/{tool_id}/convert` (`lib/galaxy/webapps/galaxy/buildapp.py:426` →
`api/tools.py:922-960`) assembles params server-side and executes. The client today only
routes to the tool form (`useToolRouting`, `client/src/composables/route.ts:30-36`);
`client/src/api/tools.ts` posts only to `/api/tools/fetch` (`:62`, `:77`).

## 4. Reframe: two flows, not one

The design question is not "how does the server build from a subset". It is "does the user
get a creator modal".

- **Curate.** Select a handful, open `CollectionCreatorIndex`, rename identifiers,
  reorder, drop some, name the list, build. The client must have those elements — the
  modal renders them. Selection over unfetched elements is *meaningless* here, because the
  point is to look at them. **This flow works today and needs nothing.**
- **Bulk.** "All 5,000 of these, minus these three." Nobody wants 5,000 rows in a modal.
  The client cannot enumerate and should not try. **This is the flow that is broken**, and
  it is broken for exactly the same reason `buildDatasetListAll` is unsatisfying in the
  history panel.

Conflating them is what makes the API-variant idea look attractive. Separate them and the
answer falls out.

## 5. Recommendation

**Add a collection operation tool. Do not add a source variant to
`CreateNewCollectionPayload`.**

Proposed: `__SUBSET_LIST__`, `tool_type = "subset_list"`, class `SubsetListCollectionTool`.

### 5.1 Why the tool, not the payload

- The payload route breaks the one-content-source invariant that
  `create_dataset_collection` asserts (`collections.py:369`) and that `__load_element`'s
  one-in-one-out contract depends on (`collections.py:729-789`). A third source means
  every caller of `create` — tools, workflow modules, the model store importer — grows a
  case it does not want.
- The bulk flow wants provenance. A 5,000-element list built by a silent POST has no
  record of what it came from. `ModelOperationToolAction` gives an implicit input edge,
  tag propagation via `preserved_hdca_tags` (`actions/model_operations.py:88-91`, `:112-113`),
  a rerun, and a workflow-extractable step — for free, and inline
  (`produces_real_jobs = False`).
- The copy/hide/nested-element semantics are already solved once, correctly, in
  `FilterFromFileTool.produce_outputs` (`tools/__init__.py:5119-5152`). A new endpoint
  would reimplement them. This is the reuse argument and it is the strongest one.
- It composes. `__SUBSET_LIST__` becomes usable in workflows and by the API without any
  further work, which a panel-specific payload variant never would be.

### 5.2 Express the subset as element indices

This is the load-bearing choice.

**Indices are the only subset language the client can speak about elements it has not
fetched.** `ContentPlaceholder` carries `element_index` and nothing else
(`collectionElementsStore.ts:11-26`), seeded densely `0..element_count-1` by
`initWithPlaceholderElements` (`:170-181`). Element identifiers are only known for fetched
elements. So identifier-based subsetting cannot express "all 5,000" without first fetching
5,000 — which is the bug.

Supporting facts:

- `element_index` is the collection's canonical order — it is the `order_by` of
  `_get_collection_contents_qry` (`collections.py:1010`) and the offset the panel pages
  against (`api/dataset_collections.py:218-225`).
- It is on the wire already: `DCESummary.element_index` (`schema.py:1104-1108`).
- Indices are dense and, once a collection is populated, stable. *Inferred*: no API mutates
  an existing collection's element set — the only element-set transition in
  `create_dataset_collection` is the unpopulated `DatasetCollection(populated=False)` case
  (`collections.py:411`), and `builder.build_collection` is the only element writer. This
  is a genuinely simpler concurrency story than history contents, where the filter's
  result set moves under you (hence `breakQuerySelection`,
  `selectedItems.ts:252-257`, `:446-452`).
- They compress. "0–4999 except 17, 203" is a short string. An identifier list of 5,000
  is not a tool param.

Identifiers should still be accepted as a second mode, because they are what a
human writing the tool form or a workflow author will want, and because `__SORT_LIST__`
and `__FILTER_FROM_FILE__` already establish identifier-keyed subsetting.

### 5.3 Concrete shape

`lib/galaxy/tools/subset_list.xml`:

```xml
<tool id="__SUBSET_LIST__" name="Subset list" version="1.0.0" tool_type="subset_list">
  <description>keeping selected elements of a collection</description>
  <type class="SubsetListCollectionTool" module="galaxy.tools" />
  <macros><import>model_operation_macros.xml</import></macros>
  <action module="galaxy.tools.actions.model_operations" class="ModelOperationToolAction"/>
  <inputs>
    <param type="data_collection" collection_type="list,list:paired,list:list,sample_sheet"
           name="input" label="Input Collection"/>
    <conditional name="how">
      <param name="how_select" type="select" label="How are the elements to keep identified?">
        <option value="by_index" selected="true">By position</option>
        <option value="by_identifier">By element identifier</option>
      </param>
      <when value="by_index">
        <param name="indices" type="text" label="Positions (0-based, comma separated, ranges allowed)">
          <sanitizer invalid_char=""><valid initial="string.digits"><add value=","/><add value="-"/></valid></sanitizer>
        </param>
      </when>
      <when value="by_identifier">
        <param name="identifiers" type="text" label="Element identifiers (one per line)"/>
      </when>
    </conditional>
    <param name="invert" type="boolean" label="Discard the named elements instead of keeping them" checked="false"/>
  </inputs>
  <outputs>
    <collection name="output" format_source="input" type_source="input" label="${on_string} (subset)"/>
  </outputs>
</tool>
```

`SubsetListCollectionTool.produce_outputs` in `lib/galaxy/tools/__init__.py` — model it
directly on `FilterFromFileTool.produce_outputs` (`:5106-5152`): resolve the index/identifier
set, iterate `hdca.collection.elements`, copy `element_object` with the
`history_content_type` branch, carry `dce.columns`, then one
`output_collections.create_collection`.

Single output, not the `(filtered)`/`(discarded)` pair. `__FILTER_FROM_FILE__` emits both
because both halves of a *criterion*-based split are meaningful; the complement of a
hand-picked subset is noise. `invert` covers the "drop these three" case.

Deliberately **not** a new `when` branch on `__FILTER_FROM_FILE__`: the id names the
mechanism, and a text-source branch makes it a lie. (Counter-argument worth hearing: one
fewer tool in the panel, and `version_updates.py` already handles that tool's version
churn.)

Registration checklist: `TOOL_CLASSES` (`tools/__init__.py:5237`),
`lib/galaxy/config/sample/tool_conf.xml.sample`,
`lib/galaxy/tool_util/ontologies/tool_tag_mappings.yml` (so it lands in the
`collection_ops` panel section — see `client/src/components/Panels/utilities.test.ts:93`),
API tests alongside the other model operation tools in `lib/galaxy_test/api/test_tools.py`.

### 5.4 What the client does

The panel button becomes flow-dependent:

- Selection is fully materialized (no placeholders in range, `unloadedElementCount == 0`
  or the selection is small) → existing path, `CollectionCreatorIndex`. Unchanged.
- Selection covers unfetched elements → collect `element_index` values, compact to ranges,
  execute `__SUBSET_LIST__`. Needs either a new client call to the tool execute endpoint or
  a thin server route in the shape of `POST /api/tools/{tool_id}/convert`
  (`buildapp.py:426`); the client has no direct-execute helper today
  (`client/src/api/tools.ts`, `composables/route.ts:30-36`).

Result is an HDCA in the history with a job behind it — the user sees a new list appear,
which is what they wanted, plus provenance they did not ask for and will be glad of.

### 5.5 The `querySelection` hookup, and whether that seam is right

Once the above exists, `CollectionPanel.vue` supplies `querySelection`
(replacing the comment at `:131-133`):

```ts
querySelection: {
    filterText: computed(() => ""),
    totalItemsInQuery: computed(() => dsc.value?.element_count ?? 0),
    filterClass: /* ??? */,
    querySelectionBreak: () => { /* ??? */ },
},
```

**The seam is the right shape but the group's contents are wrong for this case, and that
should be fixed rather than papered over.** Concretely:

- `totalItemsInQuery` → `element_count` is exact and correct. This is the piece that makes
  `selectionSize` (`selectedItems.ts:43-45`) report 120 rather than 100, which is the whole
  point.
- `filterText` and `filterClass` are dead weight. `filterClass.testFilters` drives
  `isSelected` during query selection (`selectedItems.ts:76-82`); with an empty filter it
  would have to be a class that matches everything, i.e. a lie dressed as a filter.
- `querySelectionBreak` exists for the history case where the result set moves
  (`selectedItems.ts:446-452`, `SelectionChangeWarning.vue`). Collections being immutable
  once populated (§5.2, inferred), it has nothing to warn about.

So the correct evolution is to **split the group**, not to fill it in with stubs: the
"selection can exceed what is loaded, and here is the true total" part
(`totalItemsInQuery`, and `isSelected` defaulting to true) is what the collection panel
needs; the "the total is defined by a filter that may shift" part (`filterText`,
`filterClass`, `querySelectionBreak`) stays history-only. The branch's decision to make the
whole thing optional is what makes that split cheap — it is already one named group with
one consumer each side. Had it stayed four required args, this would be a refactor of both
panels instead of a narrowing of one type.

Recommend: keep `QuerySelectionOptions` as-is on this branch. Split it when
`__SUBSET_LIST__` lands, not before.

## 6. Correctness questions the server-side path raises

These are hidden by the client-side path only because the client-side path silently drops
what it cannot see.

**Sub-collections.** "All elements" of a `list:paired` means the pairs, not the datasets —
`FilterDatasetsTool` already settles this (`tools/__init__.py:4536-4544`: the sub-collection
is the unit and is kept only if all children pass). The panel today cannot even select
them: `selectableDatasets` filters to `isDatasetElement` (`CollectionPanel.vue:100-104`,
`api/index.ts:252`), so a `list:paired` has zero selectable rows. Any server-side path must
either restrict `input` to flat lists (simplest — mirror `FilterDatasetsTool`'s assert) or
the panel must make sub-collection rows selectable first. **Recommend the restriction for
v1**, with `collection_type="list,sample_sheet"` on the input param, widened later.

**Duplicate HDAs under two identifiers.** Legal today — nothing prevents the same HDA
appearing at two element indices. Index-based subsetting handles this correctly and
identifier-based subsetting does not (`__FILTER_FROM_FILE__` would keep both). Another
point for indices.

**Identifier collisions in the new list.** Cannot happen for an index subset of a single
source list: `new_elements` is a dict keyed by `element_identifier`
(`tools/__init__.py:5128-5133`, `:4745-4747`), and the source collection's identifiers are
already unique at a level by that same construction. A subset of unique keys is unique.
Worth an explicit test rather than an assumption.

**Deleted / purged elements.** `DatabaseOperationTool.valid_input_states`
(`tools/__init__.py:4036-4044`) and `check_inputs_ready` (`:4051-4082`) already gate this,
and the class attributes are per-tool (`require_dataset_ok`, `require_terminal_states`).
`FilterFromFileTool` inherits the defaults (`require_dataset_ok = True`,
`tools/__init__.py:4032`), meaning it refuses collections containing non-OK datasets. For a
subset tool that is probably too strict — the user may be selecting *around* a failed
element. **Recommend `require_dataset_ok = False`, `require_terminal_states = True`**,
matching `FilterDatasetsTool` (`:4488-4489`). This is a real design decision, not a
detail: it determines whether the feature works on the collections users most want to
subset.

**Permissions.** The direct path checks per element: `hda_manager.get_accessible`
(`collections.py:767`). The tool path checks once, on the input HDCA, via the standard
tool input resolution. The `hdca` source in `__load_element` (`:785-787`) notably does
*neither* a copy nor an ownership check — its own TODO admits this. The tool path is
therefore no worse and arguably better-defined, but the question "can a user subset a
collection they can see but do not own, and what do the copies belong to" needs an answer.
`ModelOperationToolAction` collects `all_permissions` (`actions/model_operations.py:90`);
*inferred* that this yields the union-of-inputs behaviour every other collection operation
tool has, i.e. the answer is "yes, same as `__SORT_LIST__` today".

## 7. Staged path

1. **Ships now, no dependencies.** The branch as it stands: one identity per row,
   normalized elements, optional `querySelection`, honest "N not loaded" reporting.
   Everything below assumes it.
2. **`__SUBSET_LIST__` tool, server only.** Tool XML + `SubsetListCollectionTool` +
   registration + API tests. Independently useful and independently reviewable; no client
   change. Depends on nothing.
3. **Client can execute a built-in tool with assembled params.** Either a direct-execute
   helper in `client/src/api/tools.ts` or a route in the shape of
   `POST /api/tools/{tool_id}/convert`. Depends on (2) only for a reason to exist.
4. **Panel wiring.** Select-all uses `element_count`; the build button branches on whether
   the selection is materialized; index compaction to ranges. Depends on (2) and (3).
5. **Split `QuerySelectionOptions`** into the "total exceeds loaded" half and the "filter
   may shift" half (§5.5). Depends on (4) — do not do it speculatively.
6. **Later, optional.** Sub-collection selection in the panel; widen the tool's
   `collection_type`. Depends on (4).

Steps 2 and 3 are independent of each other and can go in parallel.

## 8. Open questions

- Bulk flow: skip the creator modal entirely, or show a stripped modal (name + hide-source
  only, no per-element editing)?
- Naming — the result gets `${on_string} (subset)`. Let the user name it, and if so, via
  what (a `text` param the panel prefills)?
- Copy semantics: model operation tools always copy element objects. Direct builds default
  `copy_elements=True` on the API (`schema.py:1852-1856`). Same effective behaviour — worth
  confirming no one relies on `copy_elements=False` from the panel.
- `hide_source_items` has no analogue in the tool path. Drop it for the bulk flow, or add a
  param?
- `require_dataset_ok = False` for the subset tool — agreed? (§6)
- v1 restricted to `list` / `sample_sheet`, or `list:paired` from the start (needs
  sub-collection rows selectable first)?
- Is index-range compaction on the client worth it, or send a plain comma list and cap it?
  What cap?
- Should the same tool back a future history-panel "build list from all matching"
  (replacing the full client-side re-fetch at `CollectionCreatorIndex.vue:64-79`)? That
  would need an HDA-list source, not a collection source — different tool, or a `data`
  repeat like `__BUILD_LIST__`?
- Is a *second* tool warranted for the discarded half, or is `invert` plus a second run
  enough?
