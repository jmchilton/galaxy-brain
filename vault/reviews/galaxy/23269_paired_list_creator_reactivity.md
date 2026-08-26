# PR 23269 — Make PairedOrUnpairedListCollectionCreator reactive to history items changing

| | |
|---|---|
| **PR** | https://github.com/galaxyproject/galaxy/pull/23269 |
| **Author** | ahmedhamidawan (Ahmed Awan) |
| **Base branch** | `release_26.1` (not `dev`) |
| **Head** | `97fb12440d` |
| **Size** | 1 file, +144 / -27 (795 → 912 lines) |
| **Worktree** | `/Users/jxc755/projects/worktrees/galaxy/pr/23269` |
| **Verdict** | **Request changes.** The bug is real and the diagnosis is right, but the fix introduces a work-loss regression: **anything the user discards comes back on the next history poll** (P1-1). Separately, the two sibling creators already solve "props changed underneath me" with a materially better shape, and this PR invents a third, more complicated one instead of extracting the second (P2-1). Fix P1-1 and I'd approve the reactivity change for the release branch; I'd move the Reset button and the auto-pair-new-items behavior to `dev`. |

---

## What it does

`PairedOrUnpairedListCollectionCreator` copied `props.initialElements` into a local
`activeElements` ref once at setup and never looked at the prop again, so uploads and deletions
that happened while the builder was open never reached the grid. The PR deletes `activeElements`,
reads `props.initialElements` directly, and adds a `watch` that runs `initialize()` on the first
tick and `reconcileWithInitialElements()` on every subsequent change.

Plus two things the PR body does not mention: a **Reset** button (`f76cb53be8`) and a
**`:collection-type` prop-binding fix** (`4cf99b7bd0`).

---

## Claims I verified

**1. The reactivity plumbing actually works end to end.** I traced the whole chain rather than
assuming the watcher fires:

- `historyDatasetsStore.fetchDatasetsForFiltertext` assigns a **new array** from the API
  (`client/src/stores/historyDatasetsStore.ts:63` — `set(cachedDatasetsForFilterText.value, filterText, returnedData)`).
- `useHistoryDatasets`'s `datasets` computed reads that slot (`useHistoryDatasets.ts:45-50`), so
  its identity changes on every successful fetch.
- `CollectionCreatorIndex.vue:91` `creatorItems` passes it straight through as `:initial-elements`
  (`:278`).
- So the shallow `watch(() => props.initialElements, …)` at `:405-416` genuinely fires. ✓

**2. …but only on one of the two entry points, and the PR body doesn't say which.**
`creatorItems` is `fromSelection ? props.selectedItems : historyDatasets.value`
(`CollectionCreatorIndex.vue:91`). In selection mode the array is
`useCollectionBuilderItemSelection.selectedItems`, whose identity is stable — and
`CollectionCreatorIndex.vue:94-107` deliberately keeps it stable by `Object.assign`-ing updates
into the existing objects. `ListWizard.vue:264` likewise passes `selectedItems`.

So **the watcher never fires in the wizard / "build list from selected items" path**, and the fix
only takes effect where `initialElements` is `historyDatasets` — i.e. `FormDataWorkflowRunTabs.vue:137-148`
(the workflow run form, which is exactly the reproduction in the PR body), `DefaultBox.vue:588`,
`SelectionOperations.vue:142`, `FolderTopBar.vue:443`. That's fine — it's the path that was broken —
but it matters for testing (see "Test quality"), because every existing Selenium test goes through
the *other* path.

**3. The frequency is higher than "when items are added or deleted".**
`useHistoryDatasets.ts:76-80` refetches on `historyUpdateTime` change, and Galaxy bumps a history's
`update_time` on any content change — including a job going `running` → `ok`. The store
short-circuits on an unchanged scope (`historyDatasetsStore.ts:33-43`), so identical polls are
cheap, but any state transition in the history produces a new array and a full
`reconcileWithInitialElements` pass. On a workflow run form with jobs in flight that is a steady
drumbeat, not an occasional event. This is what makes P1-1 likely rather than theoretical.

**4. `splitIntoPairedAndUnpaired` is genuine reuse, not a near-duplicate.**
`client/src/components/Collections/pairing.ts:370-393`. It is the canonical helper, it already backs
`usePairingSummary.autoPair` (`common/usePairingSummary.ts:35`), and it has direct unit coverage
(`pairing.test.ts:116-139`). Calling it from `addNewElementsToRowData` is the right call. Cost is
not a concern either — it's O(n·m) LCS over the *new* batch only, typically 1–2 elements, not over
the whole history. ✓

**5. The `:collection-type` fix is real and the prop is indeed under-typed.**
Before: `collection-type="collectionType"` — a static attribute, so `CollectionCreator` received the
literal string `"collectionType"`. It feeds `shortWhatIsBeingCreated`
(`common/CollectionCreator.vue:80-87`), which falls back to `"collection"` when the value isn't a
key of `COLLECTION_TYPE_TO_LABEL`. So the symptom was generic wording ("Create a collection" instead
of "Create a list of pairs") in the help header and buttons — cosmetic, but a genuine bug.

The reason nothing caught it is `collectionType?: string` at `common/CollectionCreator.vue:35`.
`PairedOrUnpairedListCollectionCreator` has the precise
`SupportedPairedOrPairedBuilderCollectionTypes` union available (`common/useCollectionCreator.ts:34-38`)
and hands it to a `string`. See P2-3. ✓

**6. `useToast()` is byte-for-byte the same object as `Toast`.** `client/src/composables/toast.ts`
ends with `export function useToast() { return { ...Toast }; }` — a spread of the same module-level
singleton, no reactive scope, no cleanup. The `import { Toast }` → `const Toast = useToast()` swap at
`:11,43` changes nothing at runtime. The composable is the documented preference for
`<script setup>`, so it isn't wrong, it's just unrelated churn in a release-branch diff. Noting it
so nobody assumes it was load-bearing. ✓

**7. Reset does actually reset — the empty-grid failure mode I went looking for isn't there.**
`syncRowDataToRowPairing` (`:281-287`) clears `rowData` and only refills it `if (summary)`, so a
falsy `currentSummary` would leave an empty grid. But every branch of `initialize()` sets it:
`autoPairWithCommonFilters` on success (`:294`), and otherwise `autoPair(…, "", "", …)`
(`:298`), which returns `{pairs: [], unpaired: elements.slice()}` for empty filters
(`pairing.ts:376-378`). Both non-null. ✓

---

## P1 findings

### P1-1 — Discarded rows come back on the next history poll

> Longform walkthrough with diagrams: [[23269_discarded_rows_resurrect]] — builds this up from what
> the component holds, verifies the history-poll chain down to the DB triggers, and is the version
> to paste into a PR comment or send to the author.

**Files:** `PairedOrUnpairedListCollectionCreator.vue:332-337, 734-754, 769-780`;
`common/CellDiscardComponent.vue:21-23`

This is the blocker. Sequence:

1. Open the builder from a workflow run form (`FormDataWorkflowRunTabs.vue:137`).
2. Click the **X** in the Discard column on a row. `CellDiscardComponent` calls
   `context.onRemove(params.data.datasets)` → `onRemove` (`:734-754`) splices the row out of
   `rowData`. `props.initialElements` is untouched — as it must be, it's a prop.
3. Anything at all changes in the history (an upload, a deletion, or just a queued job going green
   — see verified claim 3). `useHistoryDatasets` refetches, the prop identity changes, the watcher
   fires `reconcileWithInitialElements`.
4. `addNewElementsToRowData` computes `existingIds` from `rowData` only (`:333`, via `knownRowIds`
   at `:315-326`) and treats anything in `initialElements` that isn't in it as *new*
   (`:334`). The discarded dataset is not in `rowData`. **It is pushed back in as an unpaired row**
   (`:367-369`).

Same for the bulk path: "Click here to discard all remaining unpaired datasets" (`:878-883`) calls
`dismissUnmatchedDatasets` (`:769-780`), which is a loop over `onRemove`. Every dismissed dataset
returns, and for `list:paired` the `unpairedProblemDatasetCount` warning banner (`:756-767, 873-886`)
comes back with them.

That is silent, repeated undo of an explicit user action, and it changes the collection the user is
about to create — a `list:paired_or_unpaired` built after this will contain elements the user
deliberately discarded. Pre-PR, `rowData` was only ever mutated by the user, so this class of bug
did not exist.

`rowData` cannot be the sole record of intent once it is being reconciled against a prop, because
"absent from `rowData`" now conflates *never seen* with *user removed it*. The fix is to record the
second one explicitly:

```ts
const discardedIds = ref<Set<string>>(new Set());

// in onRemove, only for user-initiated removals (the `refresh = true` default),
// not for the internal removals reconcileWithInitialElements does:
if (refresh) {
    discardedIds.value.add(rowId);
}

// in addNewElementsToRowData:
const newElements = elements.filter((el) => !existingIds.has(el.id) && !discardedIds.value.has(el.id));

// in initialize(), so Reset really does start over:
discardedIds.value.clear();
```

Two notes on that sketch. `onRemove`'s `refresh` flag is currently a rendering concern, and
`reconcileWithInitialElements` already passes `false` for its own internal removals (`:386, 389, 394`)
and `onUnpair` passes `false` at `:706` — so overloading it as "was this the user" happens to line
up today, but it's the kind of coincidence that rots. I'd rather add an explicit second parameter,
or split a `discardRow()` wrapper for the two user-facing call sites (`CellDiscardComponent` and
`dismissUnmatchedDatasets`). And note that `onUnpair` must *not* mark anything discarded — it
re-adds both halves immediately.

The prune half of the reconcile also needs `discardedIds` cleanup when an id leaves
`initialElements` entirely, or the set grows unbounded across a long session. Trivial, but worth
doing in the same pass.

---

## P2 findings

### P2-1 — Both sibling creators already solve this, with a better shape

**Files:** `ListCollectionCreator.vue:102-149, 311-318`; `PairCollectionCreator.vue:112-128, 130-174`;
`PairedOrUnpairedListCollectionCreator.vue:313, 378-416`

This is the structural ask, and it's the one that decides whether the PR leaves an abstraction
behind or accretes. The collection-creator family already has a "props changed underneath me"
pattern — in **two** places, both converged on the same shape:

```ts
// ListCollectionCreator.vue:311-318, and PairCollectionCreator.vue:112-128
watch(
    () => props.initialElements,
    () => {
        // for any new/removed elements, add them to working elements
        _elementsSetUp();
    },
    { immediate: true },
);
```

`_elementsSetUp()` is **one idempotent function** run in both the initial and the subsequent case.
It rebuilds the derived list from the prop and then reconciles the user's in-progress selection
(`inListElements`) by id, keeping what survived and toasting for what didn't
(`ListCollectionCreator.vue:126-144`, `PairCollectionCreator.vue:144-168`).

This PR does the same job with three functions and a module-level flag:

```ts
let hasInitialized = false;              // :313
watch(() => props.initialElements, (newInitialElements) => {
    if (!hasInitialized) { hasInitialized = true; initialize(); }
    else { reconcileWithInitialElements(newInitialElements); }
}, { immediate: true });                 // :405-416
```

Three concrete problems with that, in increasing order of how much I care:

**(a) The flag is pure ceremony.** `watch(…, { immediate: true })` calls the callback synchronously
during setup, so the block above is exactly equivalent to:

```ts
initialize();
watch(() => props.initialElements, reconcileWithInitialElements);
```

Eight lines and a mutable module-level `let` become two. `hasInitialized` cannot be read as
anything but scaffolding.

**(b) Two code paths that have to be kept in agreement.** `initialize()` (`:289-311`) and
`reconcileWithInitialElements()` + `addNewElementsToRowData()` (`:332-403`) both decide about filter
detection, `removeExtensions`, duplicate checking and refresh — and they already disagree (P2-2).
The siblings have one path, so they can't drift. If the incremental path exists purely to preserve
the user's manual pairs across a refresh, the sibling answer applies directly: rebuild from the
prop, then re-project the user's edits onto it by id, in one function.

**(c) The behavior diverges for the same event.** When a dataset the user had selected disappears,
both siblings toast *"has been removed from the collection"*
(`ListCollectionCreator.vue:141-142`, `PairCollectionCreator.vue:165-166`). This one silently
deletes the row, and in the half-a-pair case silently breaks the pair apart
(`:387-391`). Three components in one directory, same event, two different behaviors — and the
silent one is the case where the user has done the most work.

**What to do.** There are now three hand-rolled id-based reconciliations of `initialElements` in
`client/src/components/Collections/`, and all three components already share
`useCollectionCreator(props, emit)` (`common/useCollectionCreator.ts:59`) — the composable that
exists precisely to hold the behavior common to all of them. That's the natural home, or a sibling
`useReconcileWithInitialElements` next to `usePairingSummary`. Extracting it also makes it
*unit-testable*, which is the whole answer to the missing-tests problem (see "Test quality").

I'm not asking for the three-way unification inside a release branch — the siblings deep-copy via
`JSON.parse(JSON.stringify(...))` (`ListCollectionCreator.vue:111`, `PairCollectionCreator.vue:139`)
and touching that is not release-branch work. What I *am* asking for on this branch is (a), which
is free, and a decision on (c). The extraction belongs on `dev`, and if you take it there, please
convert the two siblings rather than leaving a fourth pattern.

### P2-2 — New-element auto-pairing is batch-order-dependent, and detects filters from the wrong set

**File:** `PairedOrUnpairedListCollectionCreator.vue:339-365`

Two related problems in `addNewElementsToRowData`, both stemming from it looking only at
`newElements`:

**Filters are detected from the new batch, not the full set** (`:343`):

```ts
const { forwardFilter, reverseFilter } = autoPairWithCommonFilters(newElements, removeExtensions.value);
```

`guessInitialFilterType` (`pairing.ts:16-47`) returns a filter type from a **single** matching name —
one `sample_1.fastq` is enough to set `illumina` and lock in `_1`/`_2`. And because detection is
gated on `!currentForwardFilter.value` (`:342`), once set it is never revisited. So: open the
builder on an empty history, upload `a_1.fastq` alone, filters become `_1`/`_2` forever; upload
`b_R1.fastq`/`b_R2.fastq` next and they will not pair. Passing `elements` (i.e. the full
`initialElements`) instead of `newElements` on line 343 is a one-word change and strictly better —
detection wants the largest sample it can get.

**New elements only pair against each other** (`:351-356`). `splitIntoPairedAndUnpaired` is called
with `newElements` alone, so two halves of a pair that arrive in *different* reconcile passes never
pair. Concretely: upload `s_1.fastq`, wait for it to land (it becomes an unpaired row), then upload
`s_2.fastq` — `s_1` is now in `knownRowIds` so it isn't in `newElements`, and `s_2` is split alone
and lands unpaired. Two unpaired rows that obviously should be a pair. The common case — both files
in one upload batch, one history update — works, which is presumably why manual testing didn't
catch it.

The right input is "everything currently unpaired plus everything new", which is another argument
for the sibling shape in P2-1: rebuild, then re-project the user's manual pairs, and this falls out.

I'd also note that on the same subject, `initialize()` calls `autoPairWithCommonFilters(props.initialElements, true)`
with a hardcoded `true` for `willRemoveExtensions` (`:291`) while `:343` passes
`removeExtensions.value`. Harmless — only `forwardFilter`/`reverseFilter` are read from either — but
the discrepancy will read as a bug to the next person. The hardcoded `true` is pre-existing.

### P2-3 — The prop that let `4cf99b7bd0` happen is still untyped

**File:** `common/CollectionCreator.vue:35`

`collectionType?: string`. That's why `collection-type="collectionType"` passed vue-tsc for however
long it was there. Every caller has something better available:
`SupportedPairedOrPairedBuilderCollectionTypes` (`common/useCollectionCreator.ts:34-38`),
`SampleSheetCollectionType`, `CollectionBuilderType` (`common/buildCollectionModal.ts`). And
`shortWhatIsBeingCreated` (`:80-87`) immediately re-widens to `string | undefined` and does an `in`
check to get back the safety the type could have given it.

Narrowing the prop to the union that `COLLECTION_TYPE_TO_LABEL` is keyed on would have made the
original mistake a compile error, and would let `:80-87` collapse to a direct lookup. That is the
"leaves a reusable abstraction behind" version of this commit — the silently-wrong prop is a symptom,
not the disease. It's a `dev` change (it will surface type errors in other callers), but it should
be filed, because otherwise `4cf99b7bd0` is a fix with nothing preventing its recurrence.

### P2-4 — `addUploadedFiles` now contradicts itself

**File:** `PairedOrUnpairedListCollectionCreator.vue:422-447`

The function no longer adds anything — it only validates and toasts, relying on the history refresh
to bring files in via `initialElements`. That's the right architecture. But the validity check
(`:429-433`) is now purely decorative: an uploaded file that fails `isElementInvalid` gets an error
toast saying it "is not a valid element for this collection", and then a second or two later
`reconcileWithInitialElements` → `addNewElementsToRowData` adds it to the grid anyway, because
neither of those functions consults `isElementInvalid`. The user is told the file is unusable and
then shown it in the list.

Two coherent options: drop the check and the error toast (honest — nothing downstream enforces it
anyway, since `initialize()` never filtered either), or make `addNewElementsToRowData` skip invalid
elements. I'd take the second, because the same gap means an errored or wrong-extension dataset that
appears in the history through any route now lands in the grid unchecked. Either way the current
state is the worst of the two.

Smaller things in the same function:

- The new toast body is not localized — `` `Look for the ${singularDatasetName} in the list below…` ``
  (`:442-445`) is a bare template literal while everything around it goes through `localize()`
  (`:432` does). The title string is also unlocalized.
- Grammar: singular branch produces *"Look for the dataset 'x' … to add **them** to a pair"*, and
  the title is *"Uploaded **files** added to history"* for one file. The `singularDatasetName`
  variable is computing a singular/plural distinction and then only applying it to half the
  sentence.
- `addedFiles[0] && addedFiles.length == 1` (`:440`) — the length check alone is the condition; the
  `addedFiles[0] &&` is there for `noUncheckedIndexedAccess` narrowing. Reordering to
  `addedFiles.length === 1 && addedFiles[0]` reads as intent rather than as a redundant guard.

---

## The Reset button (undisclosed scope)

**File:** `PairedOrUnpairedListCollectionCreator.vue:887-895`, commit `f76cb53be8`

**On its merits: it's a good idea, and it's under-finished.**

It's plainly a *feature*, not part of the fix — the PR body describes only the reactivity change.
A pairing wizard where the user can drag rows around, click-pair, unpair, rename identifiers and
discard rows genuinely needs an escape hatch, and this component had none. So I'm for it. Three
problems:

1. **No confirmation on a destructive action.** `@click="initialize"` wipes every manual pair, every
   edited identifier, and every discard, immediately. `useConfirmDialog` is already imported and
   already used in this very component for the much milder "create a list with no entries?"
   (`:39, 587-590`). Reusing it here is four lines and the abstraction is already at hand.

2. **Not addressable from the test framework.** The sibling control seven lines up carries
   `data-description="dismiss unmatched datasets"` (`:880`) and is registered at
   `client/src/utils/navigation/navigation.yml:503` as `dismiss_unmatched`. The Reset button has no
   `data-description`, so it can't be reached through the existing `collection_builders.list_wizard`
   component tree. Add `data-description="reset pairing"` and a `reset:` line in `navigation.yml`
   beside `dismiss_unmatched` — that's the house style and it's the difference between testable and
   not.

3. **It doesn't clear the pairing target.** `initialize()` rebuilds `rowData` but leaves
   `activeUnpairedTarget` (`:713`) and `pairingTargetsStore.unpairedTarget` pointing at a row object
   that no longer exists. If the user had click-selected one dataset (first half of a click-pair) and
   then hits Reset, the next click calls `onPair(staleId, newId, "click")` (`:729`); if the stale
   dataset got auto-paired by the Reset, `firstIndex` stays `-1` (`:638`) and the click is silently
   swallowed with the highlight still stuck on. `onPair` already has the two lines to fix this at
   `:696-697` — `initialize()` should do the same. **The identical dangling state applies to
   `reconcileWithInitialElements`** when the active target's dataset is deleted out from under it,
   so this is worth fixing regardless of what happens to the Reset button.

Also: the button renders for `list:list` (`flatLists`) too, where there is no pairing at all, and its
tooltip says *"Discard all manual pairing and start over."* For a flat list it actually un-discards
discarded rows and reverts renamed identifiers, which is not what the tooltip promises. Either hide
it under `v-if="!flatLists"` or reword to something like "Discard all changes and start over" —
which is more accurate for the paired case too, since it also throws away identifier edits.

**On process:** undisclosed scope on a release branch. See below.

---

## Release-branch scope — my recommendation

Base is `release_26.1`, which merges forward into `dev`. Three separable things are in this diff:

| | belongs on `release_26.1`? |
|---|---|
| The reactivity fix (`7f819bfc16`) | **yes** — it's the reported bug, and the stale-grid behavior is bad (users build collections from a list that no longer matches their history) |
| The `:collection-type` binding fix (`4cf99b7bd0`) | **yes** — one character, cosmetic-but-wrong, zero risk |
| The Reset button (`f76cb53be8`) | **no** — a new UI control, undisclosed in the PR body, and per the section above it needs a confirm dialog, a `data-description`, and target-state cleanup before it's finished. It's good work; it should go to `dev` as its own PR where the review can be about the feature |
| Auto-pairing new items (`97fb12440d`) | **borderline** — it's a behavior change, not a fix, and P2-2 says it's order-dependent today. Adding new items as unpaired rows on the release branch is the conservative, obviously-correct behavior; auto-pairing them can land on `dev` once it works for the sequential case |

Splitting that way also shrinks the release diff to roughly the reactivity change plus the one-char
prop fix, which is the right size for a release branch. And it means the two pieces that need more
design work (Reset semantics, auto-pair-on-arrival) get reviewed on their own merits rather than
riding along.

Whatever you decide, please update the PR body — the "How to test" section describes only the
reactivity scenario, and a reviewer following it will never click the Reset button at all.

---

## Reuse check — what this leaves behind

**Genuine reuse.** `splitIntoPairedAndUnpaired` and `autoPairWithCommonFilters` are the canonical
helpers in `pairing.ts`, already unit-tested, already used by `usePairingSummary` and `usePairing`.
Deleting the hand-rolled add path in `addUploadedFiles` in favor of them is a net simplification.
`GButton` and `FontAwesomeIcon` are the house components. Import ordering is correct — `GButton`
sorts before `CollectionCreator` in the `@/components/…` block (`:30-33`), and everything is at
module top level.

**Not reused.** The reconciliation itself. `ListCollectionCreator` and `PairCollectionCreator`
already do this (P2-1) and this is a third implementation with a different shape and different
user-visible behavior. Nothing was extracted; `useCollectionCreator` — the shared composable all
three already call — is untouched.

**Net.** The component goes 795 → 912 lines, which makes it comfortably the largest in the family
(`ListCollectionCreator` 776, `PairCollectionCreator` 600, `common/CollectionCreator` 492), and 117
of those new lines are pure list-manipulation logic with no dependency on the template or on ag-grid
beyond the single `_refresh()` call at the end. That is about as clean a seam for a composable as
you get. It doesn't cross 1000 lines and I wouldn't block on size alone — but the added code is the
part that most wants to live outside the component, and moving it out is also what makes it
testable. Same conclusion from two directions.

One small thing that *is* a real improvement worth keeping: deleting `const activeElements = ref(props.initialElements)`
removes a genuine footgun. `ref()` on an array does not copy it, so the old `addUploadedFiles` was
pushing into the prop array — mutating `historyDatasetsStore`'s cached array from a child component.
Good riddance.

---

## Test quality

**Zero automated tests, and the manual instructions exercise a path that the change can't affect.**
Step 1 of "How to test" is a workflow run form, which is the right (non-selection) entry point — but
steps 5 and 6 are the only checks, and neither touches discard, Reset, or the sequential-upload
pairing case. P1-1 and P2-2 both survive the stated manual procedure.

**What coverage exists nearby.** The pairing logic is well covered — `pairing.test.ts` (151 lines,
table-driven over `splitIntoPairedAndUnpaired` / `autoPairWithCommonFilters`),
`common/stripExtension.test.ts`, and notably `composables/useHistoryDatasets.test.ts`, ~490 lines
testing exactly the composable that feeds this component's prop. So the argument that "this area isn't
tested" doesn't hold: the pure functions around this component are tested, and the composable
supplying its prop is tested. It's the component's own state machine that has none.

There is also real Selenium coverage: `lib/galaxy_test/selenium/test_collection_builders.py` has
six builder tests including `test_build_paired_unpaired_list` (`:91-105`), with a developed page-object
layer (`navigates_galaxy.py:2740-2800`, `navigation.yml:486-510` — rows, cells, link/unlink buttons,
`dismiss_unmatched`). **But every one of them goes through `history_panel_build_list_*`, i.e. the
selection path — where per verified claim 2 the watcher never fires.** So the existing suite cannot
regress any of this, in either direction.

**The tests I'd want, concretely.**

*Unit (vitest), and this is the one that matters.* Extract the reconciliation into a pure function
or composable per P2-1 — signature roughly `reconcileRows(rows, elements, { forwardFilter, reverseFilter, removeExtensions, discardedIds })`
returning new rows — and it becomes testable in exactly the style of `pairing.test.ts`, with no
ag-grid, no pinia, no mounting. New file `client/src/components/Collections/reconcile.test.ts`:

```
- keeps a manually-created pair when an unrelated dataset is added
- keeps an edited list identifier across a reconcile
- splits a pair back to two unpaired rows when one half is deleted
- drops the row entirely when both halves are deleted
- does not resurrect a discarded element            <- red today, green after P1-1
- does not resurrect elements dropped by dismissUnmatchedDatasets   <- red today
- auto-pairs _1/_2 arriving in one batch
- auto-pairs _1/_2 arriving in two successive batches               <- red today, P2-2
- detects filters from the full element set, not just the new batch <- red today, P2-2
```

Six of those nine are red against this branch. That is the strongest argument for the extraction —
the refactor isn't tidiness, it's what makes the bugs above expressible as tests.

*Selenium, one test.* In `test_collection_builders.py`, reach the builder through the
non-selection path (the workflow run form, or `DefaultBox`), then: upload a dataset while the
builder is open and assert a new row appears; discard a row, upload again, and assert the discarded
row has **not** come back. That second assertion is P1-1 and it needs no new page-object work beyond
a `reset:`/`discard:` selector in `navigation.yml`.

*Nothing was weakened.* `git diff --diff-filter=DR` against `origin/release_26.1` is empty — no test
file deleted or renamed, and no existing test touched. The only assertion-shaped change is
`gridApi.value!` → `gridApi.value?.` at `:702`, which is a necessary consequence of `initialize()`
now running before the grid is ready, not a silenced check.

---

## P3 findings

**P3-1 — `hasInitialized` should be a `ref` or gone.** `let hasInitialized = false` at `:313` is a
plain module-scope `let` in `<script setup>`, which is per-instance (setup runs per instance) so it
is *correct* — but it reads like shared module state, and `eslint` conventions in this repo push
mutable component state through `ref`. Per P2-1(a) the right answer is to delete it entirely.

**P3-2 — Reconciled rows land at the bottom, losing position.** Both the "one half of a pair was
deleted" survivor (`:390`) and every newly-added element (`:358, 361, 368`) are `push`ed. The
survivor case is the one that reads as a bug: a pair sitting at row 3 gets deleted and its surviving
half reappears at row 40. `onUnpair` (`:705-709`) already does this correctly — it captures
`targetIndex` from `onRemove`'s return and splices in place. Reuse that:
`const i = onRemove(row.datasets, false) ?? rowData.value.length; rowData.value.splice(i, 0, unpairedRow(survivor));`

**P3-3 — `knownRowIds()` is rebuilt on every reconcile.** `:315-326` walks all rows to build a `Set`
on each pass, and per verified claim 3 that's every history update. For a few hundred datasets it's
nothing; I mention it only because the same walk is done again immediately by
`reconcileWithInitialElements`'s own loop (`:381-397`), so one pass could produce both. Not worth
changing on its own — worth folding in if the extraction in P2-1 happens.

**P3-4 — `reconcileWithInitialElements` takes an argument it doesn't need.** It's called with
`newInitialElements` (`:412`) but every other function in the file reads `props.initialElements`
directly, including `addNewElementsToRowData`'s caller at `:399` which passes the same value
through. Two names for one thing.

**P3-5 — `onRemove`'s `refresh` flag is doing two jobs.** Covered under P1-1, but worth stating on
its own: the flag currently means "redraw the grid", and the P1-1 fix would tempt you to read it as
"the user did this". They coincide today (`:386, 389, 394` and `:706` pass `false`; the two
user-facing call sites take the default) but that's coincidence, not contract.

**P3-6 — The `|| []` fallbacks are dead but load-bearing-looking.**
`CollectionCreatorIndex.vue:278` and `ListWizard.vue:264` both render `:initial-elements="…|| []"`.
Neither operand can be falsy today (`selectedItems = ref<HistoryItemSummary[]>([])` at
`collectionBuilderItemsStore.ts:11`, and `historyDatasets` is always an array). That's fortunate,
because a `[]` literal in a template creates a **new array on every re-render** — which, now that
`initialElements` identity is a reactivity trigger, would fire `reconcileWithInitialElements([])` on
every render and wipe the grid. It's safe today; it is now a much sharper edge than it was, and
worth a comment or removal.

---

## What I did not check

- **No client tests were run, and no lint or vue-tsc.** `client/node_modules` does not exist in this
  worktree and I did not run `pnpm install`. Every claim here comes from reading the source; the
  behavioral findings (P1-1, P2-2) are traced through the code, not observed in a browser.
- **No live Galaxy and no Selenium run.** I did not reproduce the original bug or verify the fix
  end to end. The author's manual verification is the only evidence the happy path works, and per
  the "Test quality" section it doesn't cover the cases I'm flagging.
- **Vue 2.7 `watch` + `immediate: true` synchronous-callback semantics** (the basis for P2-1(a),
  that `hasInitialized` is removable) is from the documented `flush: 'pre'` behavior and from the
  two siblings relying on exactly that, not from an executed test.
- **Galaxy bumping `history.update_time` on job state transitions** (verified claim 3, which sets
  how often reconcile runs) I did not confirm in the server code — I traced only the client half,
  from `historyStore` through `useHistoryDatasets`. If update_time is bumped less often than I
  assume, P1-1 is less frequent but not less real.
- **How `historyStore` refreshes `update_time` while the run form is open** — I confirmed the
  refetch is wired to it (`useHistoryDatasets.ts:76-80`) but did not trace the polling that keeps
  the history store itself fresh.
- **Whether narrowing `CollectionCreator`'s `collectionType` prop (P2-3) compiles** across all five
  callers. I read the callers but could not typecheck.

---

## Merged 2026-08-17 — `75c2029439` into `release_26.1`

Merged without a further review pass from me. Nine commits; the four added after my review
(2026-08-12) are the response to the two comments posted on the PR. Line anchors below are
against `origin/release_26.1` as merged, not `97fb12440d`.

### What the author fixed

- **P1-1 (blocking) — fixed.** `discardedIds` (`:334`) is a module-level `Set` written by
  `onRemove`, consulted by `addNewElementsToRowData`'s filter (`:356`) and cleared by
  `initialize()` (`:307`). That is the shape my write-up asked for, in the place it asked for.
- **A second bug the author found on their own** — paired and unpaired rows shared an id
  namespace, so AG Grid held stale rows across a discard (`983aff61fb`); `unpairedRowId`/
  `pairedRowId` (`:252-259`) namespace them, with tests (`d149e2e177`). Not something my review
  caught.
- **P2-1, partially** — `hasInitialized` is gone (`691d390559`); the file now runs `initialize()`
  once at setup and `watch(() => props.initialElements, reconcileWithInitialElements)` (`:457-459`).
  The flag was the removable half. The structural half stands: `initialize()`,
  `reconcileWithInitialElements()` and `addNewElementsToRowData()` are still three functions doing
  what the siblings do with one idempotent `_elementsSetUp()`.
- **Toasts** (`130e82701c`) — `toastRemovedFromCollection` / `toastNoLongerAvailable` (`:395-416`)
  now match `ListCollectionCreator`/`PairCollectionCreator` wording, and the strict-`:paired` case
  is distinguished from the flat case.

### What shipped unaddressed

The release-scope split I recommended was not taken: the Reset button and auto-pair-on-arrival
went to `release_26.1` with the fix. Everything below is present in the merged code.

- **P2-2** — `:365` still detects filters from `newElements` rather than the full set (now guarded
  by `if (!currentForwardFilter.value || !currentReverseFilter.value)` with a comment explaining the
  empty-history case, so the "never revisited" half is softened, but one `a_1.fastq` still locks in
  `_1`/`_2`). `:373` still splits `newElements` alone, so halves of a pair arriving in different
  reconcile passes never pair. `:309` still hardcodes `true` for `willRemoveExtensions` against
  `removeExtensions.value` at `:365`.
- **P2-3** — `CollectionCreator.vue:35` is still `collectionType?: string`, with `:81-83` still
  re-widening and doing the `in` check. `dev` change; nothing prevents `4cf99b7bd0` recurring.
- **P2-4** — unchanged. `addUploadedFiles` (`:466-491`) toasts *"not a valid element for this
  collection"*, then `addNewElementsToRowData` adds the element anyway because it never consults
  `isElementInvalid`. Unlocalized toast body and the singular/plural grammar are also as reviewed.
- **Reset button** — all three gaps intact. `:946-953` is `@click="initialize"` with no `confirm`
  (`useConfirmDialog` is imported at `:10` and used only for the empty-list case at `:631`), no
  `data-description` so `navigation.yml` still has no `reset:` beside `dismiss_unmatched`
  (`:503`), and `initialize()` does not clear `activeUnpairedTarget` (`:759`) — the only reset of
  it is inside `onPair` (`:742`). The same dangling target applies to `reconcileWithInitialElements`
  when the active target's dataset is deleted. It also still renders for `flatLists` with the
  pairing-specific tooltip.

### Disposition

P2-2, P2-3, P2-4 and the Reset-button gaps are all `dev` work now. Recorded in `index.md` under
Follow-ups. Worktree kept — merged today, so it is inside the 3-day hold in the lifecycle rule.
