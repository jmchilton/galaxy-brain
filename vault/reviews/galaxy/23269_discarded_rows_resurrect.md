# PR 23269 — Discarded rows come back on the next history poll

> **Resolved.** Fixed by `2505573717` and shipped in `75c2029439` (merged into `release_26.1`
> 2026-08-17) — a `discardedIds` set filters `addNewElementsToRowData` and is cleared by
> `initialize()`. The author also found a related row-id namespacing bug the write-up below does
> not cover. See the Merged section of [[23269_paired_list_creator_reactivity]]. Kept as-is: it
> describes the code at `97fb12440d`.

Standalone walkthrough of the P1 in [[23269_paired_list_creator_reactivity]]. Self-contained: it
builds up from what the component holds, so it can be read without the full review note, pasted
into a PR comment, or sent to the author.

**Repo:** galaxyproject/galaxy · **PR:** #23269 · **Head:** `97fb12440d` · **Base:** `release_26.1`
**File under discussion:** `client/src/components/Collections/PairedOrUnpairedListCollectionCreator.vue`
(all bare `:NNN` anchors below refer to it, at that head)

---

## 1. What the component holds

`PairedOrUnpairedListCollectionCreator` is the pairing wizard — the grid where you turn a pile of
history datasets into a `list:paired`, `list:paired_or_unpaired`, or flat `list` collection.

Two data structures matter, and the whole bug is about the relationship between them.

```
  props.initialElements  ─── what the history currently contains
                             (a prop; the component must never write to it)

  rowData                ─── what the grid is showing right now:
                             pairs the user made, identifiers the user edited,
                             rows the user discarded
```

`rowData` is not a view of `initialElements`. It is *the user's work product*. A row in it may be a
pair the user assembled by hand; a row absent from it may be a dataset the user deliberately threw
away. That distinction is the thing that gets lost.

---

## 2. Before this PR: one writer, no ambiguity

`rowData` was built once at setup from `props.initialElements` and after that **only the user
mutated it**. Discard removed a row; nothing ever put one back. The prop was read once and never
consulted again.

That is exactly the reported bug — uploads and deletions that happened while the builder was open
never reached the grid — and it is worth fixing. But note the property it accidentally guaranteed:

> Absent from `rowData` ⇒ the user removed it.

Nothing else could remove a row, so nothing else needed to be distinguished.

---

## 3. What the PR changed

`activeElements` is deleted, `props.initialElements` is read directly, and a watcher now reconciles
the two on every change (`:405-416`):

```ts
watch(
    () => props.initialElements,
    (newInitialElements) => {
        if (!hasInitialized) {
            hasInitialized = true;
            initialize();
        } else {
            reconcileWithInitialElements(newInitialElements);
        }
    },
    { immediate: true },
);
```

`reconcileWithInitialElements` (`:378-403`) does two passes: prune rows whose datasets are gone,
then `addNewElementsToRowData(newInitialElements)` (`:399`) to add rows for anything new.

Now there are **two writers** of `rowData` — the user, and the reconcile. The guarantee from §2 is
gone, but the code that depends on it was not updated.

---

## 4. The defect: "new" is computed by subtraction

`addNewElementsToRowData` decides what is new like this (`:333-334`):

```ts
const existingIds = knownRowIds();                                   // :315-326 — reads rowData ONLY
const newElements = elements.filter((el) => !existingIds.has(el.id));
```

`knownRowIds()` walks `rowData` and collects the ids it finds (`:315-326`). So "new" means
*"present in `initialElements`, absent from `rowData`."*

Two completely different situations satisfy that predicate:

```
                        in initialElements?   in rowData?   what it actually means
  ───────────────────────────────────────────────────────────────────────────────────
   a dataset just              yes                no        genuinely new — ADD IT
   uploaded

   a dataset the user          yes                no        deliberately discarded —
   discarded                                                LEAVE IT ALONE
  ───────────────────────────────────────────────────────────────────────────────────
                                                    ▲
                                     these are indistinguishable to the code,
                                     and both take the "ADD IT" branch (:358, :361, :368)
```

A discard removes the row from `rowData` (`onRemove`, `:734-753`) and — correctly, it is a prop —
leaves `props.initialElements` untouched. Which puts the discarded dataset in exactly the state the
`newElements` filter reads as "new".

**The user's discard is recorded nowhere durable. It exists only as an absence, and absence is the
same shape as "not yet added".**

---

## 5. The failure, step by step

```
  t0   User opens the builder from a workflow run form.
       rowData = [ pair(A1,A2), unpaired(B), unpaired(C) ]

  t1   User clicks the X in the Discard column on row C.
       CellDiscardComponent.onRemove()
         └─> context.onRemove(params.data.datasets)
               └─> onRemove(...)            :734-753
                     └─> rowData.splice(index, 1)

       rowData          = [ pair(A1,A2), unpaired(B) ]      ← C gone
       initialElements  = [ A1, A2, B, C ]                  ← C still here (it is a prop)

  t2   ANYTHING changes in the history. An upload, a deletion, or a queued
       job turning green. (See §6 — this is not rare.)

         history.update_time bumps
           └─> useHistoryDatasets refetch          useHistoryDatasets.ts:76-80
                 └─> store assigns a NEW array     historyDatasetsStore.ts:63
                       └─> props.initialElements identity changes
                             └─> watcher fires     :405-416
                                   └─> reconcileWithInitialElements()

  t3   reconcile prunes nothing (A1, A2, B, C all still valid), then:

         existingIds  = {A1, A2, B}            ← from rowData :333
         newElements  = [C]                    ← C is not in rowData :334
         rowData.push(unpairedRow(C))          ← :368

       rowData = [ pair(A1,A2), unpaired(B), unpaired(C) ]

       C is back. No toast, no undo, no indication anything happened.
```

The user discards it again; the next history update brings it back again. On a run form with jobs
in flight this is a loop.

---

## 6. Why this fires constantly, not occasionally

The trigger is not "a dataset was added or deleted" — it is **any** change to the history. Verified
end to end, client and server:

```
  job goes running → ok
        │
        │  the job updates its output HDA's state
        ▼
  UPDATE on history_dataset_association
        │
        │  AFTER INSERT / AFTER UPDATE triggers on that table
        │  write a history_audit row
        │      lib/galaxy/model/triggers/update_audit_table.py:11-12
        │      migrations/.../c716ee82337b_replace_triggers.py
        ▼
  History.update_time = max(HistoryAudit.update_time)
        │      lib/galaxy/model/__init__.py:3659-3661  (a column_property)
        ▼
  client historyStore sees a new update_time
        │      useHistoryDatasets.ts:41
        ▼
  watch([historyIdValue, historyUpdateTime, filterTextValue]) refetches
        │      useHistoryDatasets.ts:76-80
        ▼
  store assigns a NEW array object
        │      historyDatasetsStore.ts:63
        ▼
  props.initialElements identity changes → watcher → reconcile
```

`History.update_time` is not a stored column — it is a `column_property` selecting
`max(HistoryAudit.update_time)`, and `history_audit` rows are written by database triggers on
**every insert or update** to `history_dataset_association` and
`history_dataset_collection_association`. A job state transition is an HDA update. So is a metadata
change, a rename, a delete, an undelete.

The reproduction in the PR body — the workflow run form — is the worst case: it is the screen where
you are most likely to have jobs running while the builder is open.

---

## 7. Blast radius

It is not just the single-row X button. `dismissUnmatchedDatasets` (`:769-781`) is the
"Click here to discard all remaining unpaired datasets" action, and it is a loop over the same
`onRemove`:

```ts
toRemove.forEach((v) => {
    onRemove(v, false);
});
```

So every dismissed dataset returns on the next poll — and with them the warning banner, because
`unpairedProblemDatasetCount` (`:756-763`) counts unpaired rows in `rowData`. The user clears the
warning, and it reappears.

The consequence is not cosmetic. `rowData` is what the collection is built from, so a
`list:paired_or_unpaired` created after a resurrection **contains elements the user explicitly
threw away**.

---

## 8. Why tweaking the reconcile does not fix it

The tempting patches do not work, and it is worth being explicit about why:

- **"Only add elements newer than the last seen set."** Requires remembering a previous
  `initialElements`, which is another derived-state cache — and it still cannot tell a discard from
  a dataset that was absent and came back (undelete, or a filter-text change repopulating the
  store).
- **"Prune-only reconcile; never add."** Reintroduces the original bug. Additions are the point of
  the PR.
- **"Compare against `initialElements` instead of `rowData`."** `initialElements` never had the
  discard applied to it, so it cannot be the source of that knowledge either.

There is no derivation that recovers the information, because **the information was never
recorded**. A user discard is a decision, and the fix has to store it as one.

---

## 9. The fix

Record removals that came from the user, and exclude them from the "new" computation.

```ts
const discardedIds = ref<Set<string>>(new Set());

// mark ONLY user-initiated discards
function discardRow(item: GenericPair<HistoryItemSummary> | UnpairedValue) {
    const rowId = "forward" in item ? item.forward.id : item.unpaired.id;
    discardedIds.value.add(rowId);
    return onRemove(item);
}

// :334 — a discarded element is not "new"
const newElements = elements.filter(
    (el) => !existingIds.has(el.id) && !discardedIds.value.has(el.id),
);

// in initialize() (:289), so Reset genuinely starts over
discardedIds.value.clear();
```

Route the two user-facing call sites through `discardRow`: `CellDiscardComponent`'s
`context.onRemove` binding, and `dismissUnmatchedDatasets` (`:769-781`).

Four things to get right:

1. **Do not overload the existing `refresh` flag.** It is tempting, because
   `reconcileWithInitialElements` passes `refresh = false` for its internal removals (`:386, :389,
   :394`) and `onUnpair` passes `false` too, while the two user-facing sites take the default
   `true`. So "refresh === true" happens to mean "the user did this" *today*. That is a
   coincidence of two unrelated concerns — `refresh` means "redraw the grid" — and the next person
   to add a call site will break it silently. Use a separate function or an explicit parameter.

2. **`onUnpair` must not mark anything discarded.** It removes a paired row and immediately pushes
   both halves back as unpaired rows. Marking them would delete them on the next poll.

3. **Pruning must clean up.** When an id leaves `initialElements` entirely, drop it from
   `discardedIds`, or the set grows for the lifetime of the builder.

4. **A pair discarded as a unit needs both ids marked.** `onRemove` keys the row by
   `item.forward.id` only (`:736-740`), so `discardRow` should add both `forward.id` and
   `reverse.id` — otherwise the reverse read comes back as a new unpaired row.

**Alternative worth considering.** The two sibling creators (`ListCollectionCreator`,
`PairCollectionCreator`) solve the general "props changed underneath me" problem with a single
idempotent `_elementsSetUp()` that rebuilds from the prop and re-projects the user's edits by id.
If this component adopted that shape, discards would be part of the projected user state rather
than an absence, and this bug would not be expressible. That is the larger P2-1 argument in the
review note; the `discardedIds` set is the minimal release-branch fix.

---

## 10. The test

None of the existing coverage can catch this, and the reason is structural rather than an
oversight: every Selenium builder test in `lib/galaxy_test/selenium/test_collection_builders.py`
reaches the builder through the *selection* path, where `selectedItems` identity is deliberately
kept stable (`CollectionCreatorIndex.vue:94-107`) — so the new watcher never fires there at all.

**Unit (the one that matters).** Extract the reconciliation into a pure function and this is
testable in the style of the existing `pairing.test.ts`, with no ag-grid, no pinia, no mounting:

```
reconcileRows(rows, elements, { forwardFilter, reverseFilter, removeExtensions, discardedIds })

  ✗ does not resurrect a discarded element                        ← red today
  ✗ does not resurrect elements dropped by dismissUnmatchedDatasets ← red today
  ✓ keeps a manually-created pair when an unrelated dataset arrives
  ✓ keeps an edited list identifier across a reconcile
  ✓ splits a pair back to two unpaired rows when one half is deleted
  ✓ clears discarded state on initialize() / Reset
```

**Selenium, one test.** Reach the builder via the non-selection path (workflow run form, or
`DefaultBox`), discard a row, upload a dataset while the builder is open, and assert the discarded
row has **not** returned. Red today.

---

## 11. What is verified, and what is not

**Verified by reading source at `97fb12440d`:**

- `knownRowIds()` reads `rowData` only (`:315-326`); `newElements` is the set subtraction
  (`:333-334`); the add branches push unconditionally (`:358, :361, :368`).
- `onRemove` splices `rowData` and never touches the prop (`:734-753`).
- `CellDiscardComponent` calls `params.context.onRemove(params.data.datasets)`.
- `dismissUnmatchedDatasets` loops `onRemove` (`:769-781`); `unpairedProblemDatasetCount` counts
  unpaired rows in `rowData` (`:756-763`).
- The watcher fires on prop *identity* change (`:405-416`), and the store assigns a new array on
  every fetch (`historyDatasetsStore.ts:63`).
- Server side: `History.update_time` is a `column_property` over `max(HistoryAudit.update_time)`
  (`lib/galaxy/model/__init__.py:3659-3661`), and `history_audit` rows are written by DB triggers
  on insert/update of `history_dataset_association` and `history_dataset_collection_association`
  (`lib/galaxy/model/triggers/update_audit_table.py:11-12`).

**Not verified — worth an independent check:**

- **Not reproduced in a browser.** No live Galaxy, no Selenium run, and the client tests were not
  executed (`client/node_modules` absent in the worktree; `pnpm install` deliberately skipped).
  The whole chain is traced through source.
- **The polling cadence that refreshes `historyStore.update_time` while a run form is open** was
  not traced. The refetch is wired to it (`useHistoryDatasets.ts:76-80`); how promptly the store
  learns of a change is unconfirmed. If it is slower than assumed, the bug is less frequent — not
  less real.
- **The `discardRow` sketch has not been compiled or run.** It is illustrative, not a patch.
- Whether any *other* consumer of this component discards rows programmatically, which would
  interact with point 1 above.
