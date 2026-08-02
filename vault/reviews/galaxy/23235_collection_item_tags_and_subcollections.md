# PR 23235 — Feature/collection item tags and subcollections

- https://github.com/galaxyproject/galaxy/pull/23235
- Author: joachimwolff (states the code was written by Claude Code / Opus 5)
- State: OPEN, no reviews, no comments at time of writing
- Size: 5 files, +240/-7, client-only
- Worktree reviewed: `/Users/jxc755/projects/worktrees/galaxy/pr/23235` @ `211e2c5c4f`, merge-base `8dd36b818b`

Two features plus one perf fix. (1) Tags become editable on dataset elements inside a
collection: a new `taggable` prop on `ContentItem` widens the `isHistoryItem` gate, plus
two workarounds inside `ContentItem` for the fact that a collection element's `object`
payload is an `HDAObject`, which carries neither `name` nor `history_content_type`.
(2) `CollectionPanel` gains item selection by instantiating the shared `useSelectedItems`
composable, and `CollectionOperations` gains a select toggle and a "Build List (n)"
button that hands the selected datasets to `CollectionCreatorIndex`. (3) `CollectionCreatorIndex`
stops fetching the whole history's datasets when it is building from a selection.

## Verdict

**Request changes.** The selection feature is wired to two different object identities for
the same row — the panel hands the composable an enriched copy on the checkbox/keyboard
paths and the raw `element.object` on the mouse-click path — so ctrl-click and shift-click
reintroduce exactly the `name: undefined` / missing `history_content_type` bugs the PR says
it fixed, and ctrl-click can put a *sub-collection* into a "Build List" selection. On top of
that, the two `ContentItem` workarounds are unnecessary: the established pattern for this
(`HistoryPanel.vue:350`) is a one-line parent handler, and normalizing the element→dataset
shape once at the boundary makes both workarounds, the `get-item-key` override, and the
WeakMap disappear. The feature is worth having; the wiring needs to be redone.

Separately, the element payload genuinely lacks `extension`/`hid`/`deleted` — the contents
endpoint serializes through `dictify_element_reference`, which is *deliberately* minimal.
The fix is to expand the selection through the existing `datasetStore` before opening the
creator, not to change the serializer. See "Structural / simplification opportunities §3".

## The code judo

Almost everything below traces to one decision: the panel keeps **two shapes for the same
row** — the store's `element.object` and a per-render enriched copy — and hands different
ones to different consumers. Collapse that to one object and most of the diff evaporates.

### The invariant the PR broke

`ContentItem` hands **its own `item` prop** to the selection handler
(`ContentItem.vue:224` → `props.selectClickHandler(props.item, event)`). `HistoryPanel`
honors that: every selection binding on the row uses the same `item`
(`HistoryPanel.vue:530-561` — `:item="item"`, `:selected="isSelected(item)"`,
`:ref="itemRefs[itemUniqueKey(item)]"`, `@update:selected="setSelected(item, $event)"`,
`@on-key-down="onKeyDown(item, $event)"`). One object, one identity.

`CollectionPanel.vue:275-290` passes `datasetFor(item)` to five bindings and
`item.object` to `:item`. That is the whole bug surface.

### Where the normalization belongs

Not per-render in a component — **once, where elements enter the client.**

The codebase already has half this pattern. `onViewDatasetCollectionElement`
(`CollectionPanel.vue:196-207`) builds a `SubCollection` = `DCObject` + `name` (from
`element_identifier`) + `hdca_id`, and `SubCollection` is a declared type in
`client/src/api/index.ts:192-197`. The dataset analogue — `HDAObject` + `name` +
`history_content_type` — is exactly what this PR needs and exactly what it hand-rolled
into a `WeakMap` instead. Complete the pattern rather than inventing a parallel one.

In `client/src/api/index.ts`, beside the existing guards:

```ts
/**
 * The dataset behind a collection element.
 *
 * The contents API serializes it via `dictify_element_reference`, which omits `name` —
 * inside a collection the element identifier *is* the name — and `history_content_type`.
 * Both are filled in at the fetch boundary so every consumer sees one consistently
 * shaped object instead of patching its own copy.
 *
 * Mirrors `SubCollection`, which does the same for `dataset_collection` elements.
 */
export interface CollectionElementDataset extends HDAObject {
    name: string;
    history_content_type: "dataset";
}

export interface DCEDataset extends DCESummary {
    element_type: "hda";
    object: CollectionElementDataset; // was: HDAObject
}

/** Fill in the history-content fields the element payload omits. */
export function normalizeCollectionElements(elements: DCESummary[]): DCESummary[] {
    for (const element of elements) {
        if (isDatasetElement(element) && element.object) {
            element.object.name ??= element.element_identifier;
            element.object.history_content_type = "dataset";
        }
    }
    return elements;
}
```

and one line in `client/src/api/datasetCollections.ts:92`:

```ts
return normalizeCollectionElements(await fetchCollectionElements({ ... }));
```

Doing it here rather than in the component matters for a second reason: the object is
enriched **before** it is handed to `collectionElementsStore` and made reactive
(`collectionElementsStore.ts:145` `set(storedElements, index, element)`). New keys on an
already-reactive Vue 2.7 object would need `Vue.set`; at the fetch boundary plain
assignment is enough, and `name`/`history_content_type` are reactive for free.

### What the panel then looks like

```ts
const selectableDatasets = computed(() =>
    collectionElements.value.filter(isDCE).filter(isDatasetElement).map((e) => e.object),
);
```

`isDCE` (`api/index.ts:226`) and `isDatasetElement` (`:240`) are the canonical guards the
PR partially reimplemented at `CollectionPanel.vue:136`; chained, they narrow correctly
and `.map` yields `CollectionElementDataset[]` with no cast.

Template — split the row by kind instead of repeating `item.element_type == 'hda'` four
times, and pass the *same* object everywhere:

```html
<ContentItem
    v-else-if="isDatasetElement(item)"
    :id="item.element_index + 1"
    :ref="itemRefs[itemUniqueKey(item.object)]"
    :item="item.object"
    :name="item.element_identifier"
    taggable
    :writable="canEdit"
    :expand-dataset="isExpanded(item)"
    :selectable="showSelection"
    :selected="isSelected(item.object)"
    :is-range-select-anchor="isRangeSelectAnchor(item.object)"
    :select-click-handler="onSelectClick"
    :filterable="filterable"
    @update:selected="setSelected(item.object, $event)"
    @on-key-down="onSelectKeyDown(item.object, $event)"
    @tag-change="(dataset, newTags) => (dataset.tags = newTags)"
    @init-key-selection="initKeySelection"
    @drag-start="setItemDragstart(item, $event)"
    @update:expand-dataset="setExpanded(item, $event)" />
<ContentItem
    v-else
    :id="item.element_index + 1"
    :item="item.object"
    :name="item.element_identifier"
    :is-dataset="false"
    :expand-dataset="isExpanded(item)"
    :filterable="filterable"
    @drag-start="setItemDragstart(item, $event)"
    @update:expand-dataset="setExpanded(item, $event)"
    @view-collection="onViewDatasetCollectionElement(item)" />
```

### What disappears

| Removed | Why |
| --- | --- |
| `datasetCache` WeakMap + `datasetFor` (`CollectionPanel.vue:106-131`) | identity is the store object's; nothing to cache or rebuild |
| `datasetKey` + `:get-item-key` (`:102-104`, `:282`) | `ContentItem`'s default key now matches `HistoryPanel`'s `itemUniqueKey` |
| hand-rolled `element_type === "hda"` predicate (`:136`) and its 4 template repeats | `isDCE` / `isDatasetElement` |
| `as HistoryItemSummary` cast (`:128`) | the mapper returns a declared type |
| `locallyEditedTags` + its watcher (`ContentItem.vue:158-171`) | `@tag-change` writes back to the store object, same as `HistoryPanel.vue:350` |
| `history_content_type` patch in `onTags` (`ContentItem.vue:302-305`) | `updateContentFields` needs `history_id` + `history_content_type` + `id`; all three are now present |

`ContentItem`'s diff shrinks from +30/-4 to +8/-4 — i.e. this almost stops being a change
to a shared component at all. `CollectionPanel` does **not** shrink; see "Prototype
results" below for measured numbers.

Blocking concerns **#1, #3 and #4 below dissolve entirely.** #2 becomes structural rather
than a missing guard: the `v-if`/`v-else` split means a sub-collection row simply never
receives `select-click-handler`. #5 is independent — just restore `v-if="canEdit && showControls"`.

### One reusable abstraction worth extracting while you're here

`` `${item.history_content_type}-${item.id}` `` exists three times: `ContentItem`'s
`getItemKey` default (`ContentItem.vue:73-75`), `HistoryPanel.itemUniqueKey`
(`HistoryPanel.vue:368`), and the PR's `datasetKey` variant. Export it once and have all
three use it. Small, but it is the difference between this PR reusing the history-panel
selection machinery and merely wedging itself alongside it.

### What the judo does *not* fix

- **`extension`, `hid`, `deleted`, `visible` are not on the wire at all** — see
  "Structural / simplification opportunities §3". No amount of client-side normalization
  can invent them. That needs a decision, and it is the only genuinely open design
  question in this PR.
- **Keying selection on the HDA id merges duplicate elements.** A `list` can hold the same
  HDA under two element identifiers; `dataset-<hda_id>` collides, so the two rows select
  and deselect together and the creator sees one entry. The DCE id (`element.id`) is unique
  by construction and would be the right key — but `ContentItem` hands `props.item` to the
  handler, so keying on the element would mean passing the element as `:item`, which is not
  what the component renders. Worth a deliberate decision: accept and note it, or gate
  selection off for collections with duplicate element objects.
- §4 (`allItems` is a compacted projection of the rendered list) and §5 (inert composable
  arguments) are orthogonal to the judo and still stand.

## Prototype results

The restructure above was built and verified, not just proposed. Branch
[`jmchilton/galaxy@review-23235-judo-prototype`](https://github.com/jmchilton/galaxy/tree/review-23235-judo-prototype),
also at `~/projects/worktrees/galaxy/pr/23235`, seven commits on
top of the PR head:

1. `Normalize collection element datasets at the fetch boundary`
2. `Give ContentItem one item identity; share the item key helper`
3. `Wire collection panel selection to one object per row`
4. `Add CollectionPanel tests for selection identity and tag write-back`
5. `Cover the creator hand-off and stub the creator module`
6. `Hydrate the selection through datasetStore, not a bare API call`
7. `Trim explanatory comments to the load-bearing ones`
8. `Make query selection an optional feature of useSelectedItems`

Verified with `vue-tsc --noEmit` (clean), eslint + prettier (clean), and
`vitest run` over `src/api`, `src/components/History`, `src/components/Collections`,
`src/components/Workflow/List`, `src/composables/selectedItems`,
`src/stores/collectionElementsStore` — **48 files, 322 tests, all passing**.

### What the prototype leaves open

The prototype addresses blocking concerns 1–5, structural §1, §2, §3, §5 and the real part
of §4, and two of the three §6 bullets. Untouched, and still standing against the PR:

- **§4's residual limitation** — a selection cannot include elements that have not been
  fetched, and the UI does not say so. Ctrl+A on a 120-element collection selects 100 and
  labels the action "Build List (100)". Inherent to paging rather than a defect; surfacing
  it is a UI decision for the author. (§4's original claims about range drift and
  interleaved sub-collections were wrong — see the corrected §4.)
- **§6 third bullet** — `:extended-collection-type="{}"` is still allocated per render.
- **Smaller findings 1–5** — `:writable="canEdit"` hiding Rerun inside sub-collections, the
  title/behavior mismatch on sub-collections, `canMutateHistory` not being an ownership
  check, the `CollectionCreatorIndex` `initialFetchDone` / global `isFetchingItems` gate,
  and the absent post-create feedback. All are author decisions or live outside the
  restructure's blast radius.

Duplicate-HDA keying (above) also still stands: it is a consequence of keying on the
dataset, which the judo commits to.

### Red-to-green: the new tests do catch the bugs

`CollectionPanel.test.ts` is new (the directory had no test file at all — the coverage gap
flagged below). Run **unmodified against the PR head**, 4 of its 6 cases fail:

| Case | vs PR head | What it pins |
| --- | --- | --- |
| `hands ContentItem the element's own dataset object` | **fails** | row receives a dataset with `name` + `history_content_type` |
| `does not select sub-collection rows` | **fails** | ctrl-clicking a sub-collection currently selects it and lights up "Build List (1)" — blocking concern #2, confirmed empirically |
| `hands the creator datasets the builders can actually use` | **fails** | the object reaching `CollectionCreatorIndex` has `name`, `extension`, `hid` — the consequence of blocking concern #1 |
| `writes a tag change back to the stored element` | **fails** | the panel owns the item; no shadow state in `ContentItem` |
| `renders the store's own element object, not a derived copy` | passes | regression guard for the one-identity invariant, not a discriminator |
| `counts a ctrl-clicked dataset row as selected` | passes | baseline; the PR gets this right |

Note the two that pass on both. The PR's visible selection state is *correct* — its
`datasetKey` is `String(item.id)`, so the enriched copy and the raw object hash to the same
key and the checkbox lights up either way. The damage only surfaces in the **value** stored
(and therefore in what the creator receives), which is why the bug is easy to miss by
clicking around and why the "hands the creator..." case is the one that matters.

Also worth noting for the author: three of these four failures are things the PR's own
manual-testing steps would plausibly have caught, but only if exercised with ctrl/shift
rather than the checkboxes.

### Correction to the estimate above

The judo does **not** reduce the line count, and I predicted otherwise before building it.
Measured against `dev`, source files only:

| | PR head | judo prototype |
| --- | --- | --- |
| `ContentItem.vue` (shared component) | +30/-4 | **+8/-4** |
| `CollectionPanel.vue` | +126 | +151 |
| total source | +195/-7 | +257/-14 |

What actually happens is a *relocation*, not a deletion: the WeakMap, `datasetFor`,
`datasetKey`, the cast and the hand-rolled predicate all go (~35 lines), but the
`v-if`/`v-else` row split re-states ~14 lines of `ContentItem` bindings, the declared
`CollectionElementDataset` contract and its doc comment cost ~42 lines in `api/index.ts`,
and the selection hydration costs ~34 in `CollectionPanel`.

That is still the right trade — the shared component nearly stops changing, the contract is
declared and tested at the boundary where it belongs, and the two-identity bug becomes
unrepresentable rather than merely fixed — but "this makes the diff smaller" is not the
argument for it, and I should not have implied it was.

### What the prototype confirmed that review alone did not

- **The `as HistoryItemSummary` cast was load-bearing.** Removing it and declaring the real
  type made `vue-tsc` reject the hand-off to `CollectionCreatorIndex`, naming all ten
  missing fields (`create_time`, `dataset_id`, `deleted`, `extension`, `genome_build`,
  `hid`, ... `visible`). Widening the creator's prop just moved the same error one layer
  down to the four builder components. **The type system will not let a collection element
  be seeded into a collection builder** — which is the strongest possible statement of
  "Structural / simplification opportunities §3", and it rules out "accept the degradation
  and widen the builders' types" as a clean resolution.
- The prototype therefore hydrates each selected element through `datasetStore` before
  opening the creator, confined to `onBuildCollection`. That turned out to be the *intended*
  design rather than a workaround — see the rewritten §3 below.
- **`stubs` does not reach children imported by a `<script setup>` parent.** Stubbing
  `CollectionCreatorIndex`/`CollectionDetails` by name in the mount options silently did
  nothing; the real components rendered. The creator has to be stubbed with `vi.mock` at
  the module level. Worth knowing for anyone writing the panel tests this PR is missing.
- **The PR's own new tests do not run outside Node 22.20.0.** `client/.node_version` pins
  22.20.0; on Node 25 every test in `ContentItem.test.js` fails with
  `window.localStorage.getItem is not a function` — including `check basics`, which the PR
  did not touch. Not a defect in this PR, but worth knowing before concluding that a
  reviewer's red run means anything.

## Blocking concerns

> #1, #3 and #4 are dissolved by the judo above rather than fixed in place. They are kept
> here because they are the evidence for it.

### 1. Two identities per row: click-path selection uses the un-enriched object

`client/src/components/History/CurrentCollection/CollectionPanel.vue:275-290` binds the
same row through two different objects:

- `:selected`, `:is-range-select-anchor`, `@update:selected`, `@on-key-down` all pass
  `datasetFor(item)` — the enriched copy (`{...element.object, name, history_content_type}`).
- `:item="item.object"` passes the raw `HDAObject`.

`ContentItem.vue:224` calls `props.selectClickHandler(props.item, event)` — i.e. it hands
the composable **`item.object`**, the raw one. Consequences:

- **Ctrl-click** → `useSelectedItems.setSelected(rawObject, true)` (`selectedItems.ts:82-86`)
  stores the *raw* object in the selection map. `selectedDatasets`
  (`CollectionPanel.vue:176`) is `Array.from(selectedItems.value.values())`, so the
  creator receives objects with no `name` and no `history_content_type`. That is precisely
  the failure mode the PR body describes (`element_identifier`/`name` rendering as
  `undefined`, ids looked up as HDCAs). `isElementInvalid`
  (`client/src/components/Collections/common/useCollectionCreator.ts:98-115`) will not
  catch it either, because its collection check keys on `history_content_type`, which is
  absent.
- **Shift-click** → `rangeSelect(rawObject, ...)` (`selectedItems.ts:141-223`) is entirely
  index-based: `allItems.value.indexOf(item)`. `allItems` is `selectableDatasets`, which
  holds enriched copies, so `indexOf(rawObject)` is `-1` and the slice arithmetic at
  `selectedItems.ts:186-192` produces an empty or wrong range. The PR body's claim that
  shift-range "cannot drift" from the history panel does not hold.
- The checkbox is worse than inconsistent: `ContentItem.onButtonSelect`
  (`ContentItem.vue:314-323`) calls `onClick(e)` on shift and *then* emits
  `update:selected`, so a shift-click on the selector runs `rangeSelect(rawObject)` and
  `setSelected(enrichedCopy)` in the same gesture.

**Remedy:** there must be exactly one object per row, and `ContentItem`'s `item` prop must
be it. See §1 of "Structural / simplification opportunities" — normalizing the element at
the boundary and passing the normalized object as `:item` fixes this and deletes code.

### 2. `select-click-handler` is bound on sub-collection rows too

`CollectionPanel.vue:286` binds `:select-click-handler="onSelectClick"` unconditionally,
while `:selectable` (`:283`) is correctly gated on `item.element_type == 'hda'`. But
`ContentItem.onClick` (`ContentItem.vue:222-235`) calls the handler regardless of
`selectable`, and the composable's own gate is `selectable: computed(() => canEdit.value)`
(`CollectionPanel.vue:161`), which is true at the root of an editable collection.

So inside a `list:paired` (or any nested collection), **ctrl-clicking a sub-collection row
adds a `DCObject` to the selection**: "Build List (1)" lights up and
`CollectionCreatorIndex` receives an object that is neither a dataset nor recognizable as
a collection (no `history_content_type`), i.e. the "History dataset collection association
not found" path the PR set out to fix.

Related: `datasetFor()` is also invoked on sub-collection rows at `:275`, `:284`, `:285`,
`:288`, `:290`, where it caches a bogus object stamped `history_content_type: "dataset"`
for a `DCObject`.

**Remedy:** gate the handler the same way as the checkbox —
`:select-click-handler="isDatasetElement(item) ? onSelectClick : undefined"` — and stop
calling `datasetFor` on non-`hda` elements (see §1; a `v-if`/`v-else` split on
`isDatasetElement(item)` in the template is the honest way to express "two different kinds
of row").

### 3. `locallyEditedTags` adds per-instance state to a shared component for something the parent already handles

`ContentItem.vue:158-171` adds a `locallyEditedTags` ref plus a `watch` on `props.item?.id`
to a component rendered in the history panel, collection panel, multi-view, sub-items and
dataset selectors. The stated reason is that nothing refreshes a collection element after
a tag write.

`ContentItem` **already emits** `tag-change` (`ContentItem.vue:90`, `:294`), and the
canonical consumer is three lines away in the sibling panel:

```ts
// client/src/components/History/CurrentHistory/HistoryPanel.vue:350
function onTagChange(item: HistoryItemSummary, newTags: string[]) {
    item.tags = newTags;
}
```

`CollectionPanel` simply does not listen to it. This is a missing one-line handler in the
feature's own component, paid for with permanent shadow state in a shared one — and it
introduces a stale-read window of its own: `locallyEditedTags` is only cleared when
`props.item?.id` changes, so a genuine server-side tag change on the same item (another
tab, a bulk tag operation) is now masked by the local override for as long as the row
stays mounted.

**Remedy:** delete `locallyEditedTags` and its watcher, restore `tags` to
`props.item.tags`, and add the `@tag-change` handler in `CollectionPanel` writing back to
the store's element object. With the normalization from §1 (mutate `element.object` in
place rather than copy it) this is literally `HistoryPanel`'s `onTagChange`, unchanged.

### 4. `history_content_type` patching belongs at the boundary, not in `onTags`

`ContentItem.vue:302-305`:

```ts
const target = props.item.history_content_type
    ? props.item
    : { ...props.item, history_content_type: isCollection.value ? "dataset_collection" : "dataset" };
```

This is a shared component compensating for one caller passing an under-specified object.
It also has a dead branch: the `"dataset_collection"` arm can only be reached by an item
that is a collection *and* lacks `history_content_type` *and* has tags enabled — which
`CollectionPanel` never produces, since `:taggable` is `hda`-only. And it is untested (the
new test only covers the `"dataset"` arm).

**Remedy:** delete it. If `CollectionPanel` hands down a properly shaped dataset,
`updateContentFields` (`client/src/components/History/model/queries.ts:49`) works with no
patching, and `ContentItem`'s diff shrinks to just the `taggable` prop.

### 5. `CollectionOperations` visibility gate removed for no benefit, with a visible regression

`CollectionPanel.vue:241-248` changes `v-if="canEdit && showControls"` to
`v-if="showControls"`, then re-gates only the new select button with `:selectable="canEdit"`.

But selection is *also* gated on `canEdit` inside the composable
(`CollectionPanel.vue:161`), so nothing was gained: the operations bar still only needs to
render when `canEdit`. What was lost:

- Drilling into a sub-collection now renders an operations bar whose only content is a
  permanently **disabled** Download button. `CollectionOperations.vue:36` computes
  `disableDownload = props.dsc.populated_state !== "ok"`, and a sub-collection is a
  `SubCollection`/`DCObject` (`client/src/api/index.ts:186-196`,
  `lib/galaxy/schema/schema.py:1073-1093`) which has no `populated_state` at all.
- `downloadUrl` and `sheetUrl` (`CollectionOperations.vue:32`, `:42`) both interpolate
  `props.dsc.id`. For a sub-collection that is a `DatasetCollection` id, not an HDCA id, so
  a `sample_sheet`-typed sub-collection would now surface a "View Sheet" link pointing at
  the wrong resource.

**Remedy:** restore `v-if="canEdit && showControls"` and drop the `selectable` prop from
`CollectionOperations` entirely — with the gate restored it is always `true`. Three fewer
props, one fewer regression.

## Structural / simplification opportunities

### 1. The code-judo move: normalize the element once, at the boundary

See "The code judo" above — normalizing `element.object` in
`fetchElementsFromCollection` and giving it a declared type next to the existing
`isDatasetElement` guard collapses concerns #1, #3 and #4 and deletes the `WeakMap`,
the `get-item-key` override, the hand-rolled predicate and the cast.

### 2. `isDatasetElement` already exists; the PR reimplements it (worse)

`CollectionPanel.vue:136`:

```ts
.filter((element): element is DCESummary => "element_type" in element && element.element_type === "hda")
```

`client/src/api/index.ts:240-242` is exactly this guard, and it narrows to `DCEDataset`
(`object: HDAObject`) rather than back to the *wider* `DCESummary`. The hand-rolled
predicate throws away the narrowing it exists to provide, which is why `datasetFor` needs
its `as HistoryItemSummary` cast downstream. The same `item.element_type == 'hda'` literal
is then repeated three more times in the template (`:279`, `:280`, `:283`).

**Remedy:** import and use `isDatasetElement` in all four places.

### 3. The `as HistoryItemSummary` cast hides a genuinely incomplete object

`CollectionPanel.vue:128` casts the enriched element to `HistoryItemSummary`
(= `HDASummary | HDCASummary`). `HDAObject`
(`lib/galaxy/schema/schema.py:1056-1070`; generated as
`client/packages/api-client/src/schema/schema.ts`) declares only
`id, model_class, state, hda_ldda, history_id, tags, copied_from_ldda_id, accessible, purged`.
Adding `name` and `history_content_type` still leaves the object missing `extension`,
`deleted`, `visible`, `hid`, `create_time`, `update_time`, `type_id`. The cast asserts
otherwise, and the object then flows into `CollectionCreatorIndex` →
`ListCollectionCreator`, which reads exactly those fields:

- `ListCollectionCreator.vue:84` — `new Set(inListElements.map((e) => e.extension))` drives
  the mismatched-extensions warning. All `undefined` → set size 1 → **the warning can never
  fire** for a list built from inside a collection.
- `ListCollectionCreator.vue:135`, `:141`, `:330` build user-facing toasts from
  `${prevElem.hid}: ${prevElem.name}` → `"undefined: ..."`.
- `useCollectionCreator.ts:107` — `element.deleted || element.purged`; `deleted` is absent,
  so deleted elements are not rejected.

**These fields are not on the wire — the client cannot invent them.** The collection panel
loads elements from `GET /api/dataset_collections/{hdca_id}/contents/{collection_id}`, which
serializes each element through `dictify_element_reference`
(`lib/galaxy/managers/collections_util.py:166-209`, selected at
`lib/galaxy/webapps/galaxy/services/dataset_collections.py:334`). That function hand-builds
the object dict as exactly `{id, model_class, state, hda_ldda, purged, history_id, tags}`,
plus `accessible` tacked on at `:344`. The sibling serializer `dictify_element` (`:213`)
*does* use the full `element_object.to_dict()`, but the contents endpoint does not use it.
So `HDAObject`'s `extra="allow"` (`lib/galaxy/schema/schema.py:1070`) buys nothing here —
nothing extra is ever emitted.

**And the existing hydration path cannot rescue it either.** `CollectionCreatorIndex`
already has a mechanism for under-specified selections — the watcher at
`CollectionCreatorIndex.vue:96-109` does `Object.assign(selectedItem, newDataset)` once
`historyDatasets` arrives, which is precisely what would fill in `extension`/`hid`/`deleted`.
It cannot help here: `historyDatasetsStore` fetches with
`DEFAULT_FILTERS = { visible: true, deleted: false }` (`historyDatasetsStore.ts:9`), and
datasets inside a collection are hidden. They are never in that list, so the `find` at
`:104` never matches. (This also means the PR's `enabled` change at `:78` does not lose
hydration for *this* flow — but it does disable it for the existing history-panel
build-from-selection flow, which is a second behavior change riding along in a one-line
perf fix. See "Smaller findings" #4.)

**Remedy — hydrate on demand. There is no server-side bug to fix here.**

I initially recommended changing the serializer. That was wrong, and the correction matters
because it is the difference between a Python PR and three lines of client code.

The omission is **deliberate and documented**. `dictify_element_reference`'s docstring
(`lib/galaxy/managers/collections_util.py:169-173`) reads: *"Load minimal details of
elements required to show outline of contents in history panel. History panel can use this
reference to expand to full details if individual dataset elements are clicked."* The lean
payload is the point — this serializer backs the collection outline in the history panel,
a hot path — and the intended client contract is to expand on demand.

That mechanism **already exists and is already used on these very rows**: `datasetStore`
(`client/src/stores/datasetStore.ts`) is a `useKeyedCache` over `fetchDatasetDetails`, and
`DatasetDetails.vue:33-34` uses it whenever a collection element is expanded. So the right
fix is to reuse it:

```ts
const datasets = await Promise.all(ids.map((id) => datasetStore.fetchDataset({ id })));
```

It dedupes in-flight requests per id, caches, and — because expanding a row populates the
same cache — a row the user already looked at costs nothing. Note `fetchDataset` resolves
to `undefined` on failure and records the error in `getDatasetError(id)` rather than
throwing; handle that rather than wrapping it in a `try`.

Adding `extension`/`hid`/`deleted`/`visible` to `dictify_element_reference` would inflate
every collection outline render to serve one modal, and would work against the documented
design. Don't.

What remains true regardless: **do not keep the `as HistoryItemSummary` cast.** Shipping a
`HistoryItemSummary`-shaped lie into a component that reads six fields it does not have is
the wrong trade — and `vue-tsc` will not let you, once the real type is declared.

### Is there a server-side bug at all? One latent one, unrelated to this PR

Not in the omission — but the LDDA branch of the same function is inconsistent with the
schema, and it is worth someone's attention independently of PR 23235:

- `DatasetCollectionElement.element_type` (`lib/galaxy/model/__init__.py:8591-8600`) can
  return `"ldda"`; the model supports LDDA elements (`ldda_id` column, `ldda` relationship,
  and a constructor branch at `:8570-8571`).
- `DCEType` (`lib/galaxy/schema/schema.py:588-592`) only admits `hda` and
  `dataset_collection`. An `"ldda"` element would fail `DCESummary` validation.
- `dictify_element_reference:205` hardcodes `object_details["hda_ldda"] = "hda"` for *any*
  non-collection element, including an LDDA.
- `history_id` and `tags` are only set `if isinstance(element_object, HistoryDatasetAssociation)`
  (`:206-208`), but `HDAObject` declares both as **required**
  (`lib/galaxy/schema/schema.py:1065-1066`) — so an LDDA element produces an object dict
  that cannot validate.
- Consistent with that, `services/dataset_collections.py:348-354` wraps the response
  construction in `except ValidationError: log.exception(...)`.

**It appears unreachable today**, which is why it is latent rather than a live bug: the only
user-facing route that accepts `src: "ldda"`
(`lib/galaxy/managers/collections.py:777-782`) calls `to_history_dataset_association(...)`
and stores the resulting **HDA**, never the LDDA. I found no code path that writes an LDDA
into a DCE. So this is dead-branch drift — either the model should stop accepting LDDA
elements, or the schema and serializer should learn about them. Not this PR's problem;
worth an issue.

### 4. `allItems` is a compacted projection of what is on screen

> **Substantially corrected after building the case.** Two of the three claims I made here
> were wrong. What survives is real but much narrower, and it turns out to share a fix with
> §5. The corrected version follows; the original claim is kept below it.

`selectableDatasets` filters `ContentPlaceholder` entries and sub-collection elements out of
a list `ListingLayout` renders in full (`CollectionPanel.vue:270-275`), and the composable's
range-select and arrow-navigation are positional over `allItems`
(`selectedItems.ts:186-192`, `:301-303`). Built as a fixture — a 120-element collection
scrolled to offset 70 — that renders 120 rows of which 20 are placeholders.

**What is *not* wrong, contrary to my original claim:**

- **Range selection picks the right set.** Filtering is order-preserving, so the datasets
  between two rows in the compacted `allItems` are exactly the datasets between those rows
  as rendered. Shift-clicking row 49 → row 70 across the 20-row gap selects 2, and those 2
  are precisely the loaded rows in the span. Smaller than the span the user swept, but not a
  *wrong* set — the rows in between have no dataset to select yet.
- **Interleaved sub-collections cannot happen.** Collections are homogeneous per level:
  every `generate_elements` implementation in `lib/galaxy/model/dataset_collections/types/`
  yields one kind, so a level is all `hda` or all `dataset_collection`. `list:paired` is a
  list whose every element is a pair. There is no interleaving to drift over.

**What is real:** the panel was configured for a selection mode it cannot honour. It passed
`totalItemsInQuery: selectableDatasets.length` — the *loaded* count — into a composable that
treats a mismatch between that number and `selectedItems.size` as "query selection", a mode
where `isSelected` answers from `filterClass.testFilters` instead of the selection. A `list`
holding the same HDA under two element identifiers makes those two numbers disagree, because
selection keys on the dataset. Verified: three rows, two of them the same HDA, select-all
reports **"Build List (3)"** while the selection holds 2 — and every row renders selected.

**Remedy — and it is §5's remedy.** Group `filterText` / `totalItemsInQuery` / `filterClass`
/ `querySelectionBreak` into one optional `querySelection` option and omit it here. Then
select-all reports what it holds and `isSelected` cannot answer from a filter. Prototyped:
`selectedItems.ts`, `types.d.ts`, and all four callers; the count above goes 3 → 2.

The residual limitation is inherent rather than a defect: **a selection cannot include
elements that have not been fetched**, and nothing tells the user so. Ctrl+A on a
120-element collection selects 100 and says "Build List (100)". Surfacing that — a note on
the build action when `element_count` exceeds what is loaded — is a UI decision for the
author, not something a reviewer should choose.

<details>
<summary>Original claim (wrong on two counts)</summary>

> So in any collection where the two arrays differ — >50 elements (placeholders, see
> `collectionElementsStore.ts:34`, `:173-176`), or a `list:paired`/`list:list` with
> sub-collection rows interleaved — shift-range selects a span that does not match what the
> user dragged over, and Arrow keys skip rows.
>
> This is not something a prop tweak fixes; it wants either (a) selection restricted to
> fully-loaded, flat collections, with the toggle hidden otherwise, or (b) `allItems`
> supplied as the same array that is rendered, with non-selectable entries handled inside
> the composable.

Order-preserving compaction makes the range set correct, and collection levels are
homogeneous so nothing interleaves. Arrow navigation does skip placeholder rows, but landing
on the next loaded row rather than a "Loading…" placeholder is defensible behavior, not a
bug. Neither (a) nor (b) is warranted.

</details>

### 5. Inert composable arguments signal a missing seam

`CollectionPanel.vue:163-172` passes `filterText: ref("")`, `filterClass: HistoryFilters`,
`onDelete: () => {}` and a `totalItemsInQuery` that is definitionally equal to
`allItems.length`, with a comment saying they are inert. They are not entirely inert:
`onKeyDown` still binds Ctrl+A → `selectAllInCurrentQuery` (`selectedItems.ts:348`), which
sets `allSelected`, and `isSelected` then routes through
`filterClass.testFilters(currentFilters, item)` (`selectedItems.ts:69-71`). With an empty
filter that returns `true` for everything — so any drift between `selectedItems.size` and
`totalItemsInQuery` (e.g. a collection containing the same HDA under two identifiers, which
collapses to one key under an id-based `getItemKey`) flips the panel into a phantom
"everything selected" state.

Importing `HistoryFilters` into the *collection* panel to satisfy a parameter the collection
panel has no use for is also feature logic leaking across a seam. `filterText`,
`filterClass`, `totalItemsInQuery` and `querySelectionBreak` are all and only the
query-selection feature; make them one optional grouped option in
`client/src/composables/selectedItems/types.d.ts`, and have the composable disable
`selectAllInCurrentQuery`/query-selection when it is absent. That is a genuinely reusable
improvement to a shared composable, and it is the difference between this PR reusing an
abstraction and this PR wedging itself into one.

**Prototyped** (commit `Make query selection an optional feature of useSelectedItems`). The
grouped `QuerySelectionOptions` is ~20 lines in `types.d.ts`; the composable guards four
expressions on its presence; `HistoryPanel`, `HistoryList` and `WorkflowList` nest four
existing arguments and are otherwise unchanged; `CollectionPanel` deletes them along with the
`HistoryFilters` import. Three cases added to `selectedItems.test.ts` for the no-query
configuration. This also resolves the real part of §4 — see above.

### 6. Smaller structural notes

- `onCreatedCollection` (`CollectionPanel.vue:46-50`) is declared at the very top of the
  script, above the store, and closes over `resetSelection` / `setShowSelection` /
  `showCollectionCreator` declared 100+ lines below. It works by hoisting, but it reads as
  the first thing in the file while depending on the last. Move it next to the composable.
  Also, `resetSelection()` there is redundant — `watch(showSelection)`
  (`selectedItems.ts:432-436`) already calls it when selection is hidden.
- `datasetKey` (`CollectionPanel.vue:102-104`) is `String(item?.id)`: an optional chain plus
  a `String()` coercion producing the literal `"undefined"` for a missing item. If the
  invariant is "every selectable row has an id", assert it rather than manufacturing a key
  that silently collides.
- `:extended-collection-type="{}"` (`CollectionPanel.vue:301`) allocates a fresh object each
  render to satisfy a prop that `SelectionOperations.vue:142-152` — the canonical caller —
  simply omits. Either omit it too, or make the prop optional in
  `CollectionCreatorIndex.vue:32` where it is declared required but is de-facto not.

## Smaller findings

1. **`:writable="canEdit"` on `ContentItem` is an undocumented behavior change**
   (`CollectionPanel.vue:281`). Previously `writable` defaulted to `true` here. Now, inside
   any sub-collection (or an archived/purged history), `writable` is `false`, which flows to
   `DatasetDetails` → `DatasetActions.vue:159` and hides the Rerun button on datasets inside
   sub-collections. Note also that `writable` is doing double duty as "selection is allowed"
   via the short-circuit at `ContentItem.vue:224` — that is not what the prop means. If the
   intent is only to disable selection outside the root, use `:selectable`, which is already
   correctly gated, and leave `writable` alone.
2. **The PR title says "subcollections" but the feature is off in sub-collections.**
   `canEdit = isRoot && canMutateHistory` (`CollectionPanel.vue:91`) means both tagging
   (via `:writable`) and selection are unavailable one level down. Either the title is
   stale or a piece is missing; worth resolving before merge.
3. **`canMutateHistory` is not an ownership check** — `client/src/api/index.ts:323-325` is
   `!purged && !archived`. It happens not to matter today because the only caller that
   renders the operations bar is the current-history panel (`Index.vue:48`; both
   `HistoryView.vue:37` and `MultipleViewItem.vue:112` pass `show-controls="false"`). But
   `CollectionCreatorIndex` is given `:history-id="history.id"` (`CollectionPanel.vue:299`),
   so if the operations bar ever renders in `HistoryView`, "Build List" will try to create a
   collection in someone else's history. Worth a comment or an explicit ownership check.
4. **`enabled: () => localShowToggle.value && !props.selectedItems?.length`**
   (`CollectionCreatorIndex.vue:74-78`) is a good fix, but it leaves `initialFetchDone`
   permanently `false` (`useHistoryDatasets.ts:70-72`), while `isFetchingItems` is read from
   a **global** store keyed by filter text (`useHistoryDatasets.ts:43`). The template gate is
   `v-if="isFetchingItems && !initialFetch"` (`CollectionCreatorIndex.vue:229`), so any
   unrelated component fetching datasets for the same (empty) filter text will now make this
   modal render "Loading items" instead of the creator. Suggest gating that alert on
   `!fromSelection` as well, which matches the error alert immediately below it.
   Also note the change disables the `historyDatasets` watcher at
   `CollectionCreatorIndex.vue:97-109` that refreshes selected items with fresh dataset
   payloads — probably fine, but it is a second behavior change riding along in a one-line
   perf fix, and it affects the *existing* history-panel build-from-selection flow, not just
   the new one.
5. **`onCreatedCollection` gives no feedback about where the collection went.** The new list
   is created in the history while the user is looking at a collection panel; the modal just
   closes. Consider leaving the creator's success state visible (drop `hide-on-create`) or
   navigating back to the history.
6. **Import placement**, `ContentItem.test.js:12` — `@/components/TagsMultiselect/StatelessTags.vue`
   is appended after `./ContentItem.vue` with no blank line, whereas the file's other
   `@/`-aliased imports are grouped at `:8-9`. Confirmed **not** a problem: eslint and
   prettier both pass on the file as written (the client uses pnpm, not yarn —
   `make client-lint`).

## Test coverage

**No existing test was modified or weakened.** The four new cases are appended to
`ContentItem.test.js:138-181`; `describe`-level setup and the `check basics` case are
untouched. Good.

What the new tests actually pin:

- `:138` / `:145` — the `taggable` gate, both directions. Real, and they would fail before
  the change. Fine.
- `:154` — that `updateContentFields` is called with `history_content_type: "dataset"`
  filled in. Real. Note it uses `expect.objectContaining` so it does not pin that the
  original `props.item` is left unmutated, which is the part that actually matters for a
  shared component.
- `:170` — that the tag shows immediately. This one pins the mechanism I am asking to be
  deleted (§3). If the fix moves to a parent `@tag-change` handler, this test should move
  to a `CollectionPanel` test asserting the store element's tags were updated.

What is untested:

- **All of `CollectionPanel.vue` and `CollectionOperations.vue`.** There is no test file in
  `client/src/components/History/CurrentCollection/` at all. The entire selection wiring —
  the enrichment, the key function, the composable options, the click/checkbox/keyboard
  paths, the "Build List" hand-off — has zero coverage, and it is where every blocking
  concern above lives. **The prototype adds `CollectionPanel.test.ts`; 4 of its 6 cases fail
  against the PR head** (see "Red-to-green" above). Mounting the panel against a
  msw-mocked contents endpoint turned out to be straightforward — this is worth having
  regardless of which way the rest of the review goes.
- The `"dataset_collection"` arm of `ContentItem.vue:304`.
- The `history_content_type`-already-present path through `onTags` (i.e. that the history
  panel's behavior is unchanged) is only covered incidentally.
- `client/src/composables/selectedItems/selectedItems.test.ts` exists and is untouched —
  reasonable, since the composable itself did not change, but if §5 (optional
  query-selection options) is taken up it should gain a case for the no-filtering
  configuration.

Manual-testing instructions in the PR body are good and specific; step 4 ("confirm
click, shift-click range and keyboard selection behave as in the history panel") is exactly
the step that should have surfaced blocking concern #1, so I would want to know whether it
was exercised with ctrl/shift specifically rather than with the checkboxes.

## What's good

- **The `taggable` prop is the right call.** Widening `isHistoryItem` would have dragged the
  `ContentOptions` menu and highlight button along with it; a separate, default-`false`
  opt-in prop leaves every existing caller untouched. Naming and the doc comment are clear.
- **Reusing `useSelectedItems` rather than hand-rolling selection** is the correct instinct,
  and it is what makes the drift argument in the PR body plausible. The problems are in how
  it was wired, not in the decision.
- **The `CollectionCreatorIndex` fetch fix is a genuine, well-scoped win** and benefits the
  existing history-panel flow too. Fetching an entire history to display two chosen datasets
  was a real bug; the comment explaining it is the right length.
- **The PR body is unusually honest** about the `HDAObject` schema gap and about the two
  deliberate behavioral decisions (tags live on the dataset; `list:paired` flattens). That
  is the kind of write-up that makes a review like this possible.
- **No file crosses the 1k-line threshold**: `ContentItem.vue` 504, `CollectionPanel.vue`
  316, `CollectionCreatorIndex.vue` 314, `CollectionOperations.vue` 120. No decomposition is
  owed on size grounds, and if the §1 restructure is taken up `CollectionPanel.vue` shrinks
  further.
- **Comments explain "why", not "what"**, and the diff contains no dead code, no
  commented-out blocks, and no drive-by reformatting.
