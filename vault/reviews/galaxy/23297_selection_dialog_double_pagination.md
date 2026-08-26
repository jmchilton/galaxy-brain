# PR 23297 — Fix empty pages for file sources with server-side pagination

| | |
|---|---|
| **PR** | https://github.com/galaxyproject/galaxy/pull/23297 |
| **Author** | AdrianJaeger |
| **Branch** | `fix-selection-dialog-double-pagination` → `dev` |
| **Head** | `05f14e3882f3bb27546f1005858c7a93af2e0d39` |
| **Size** | 1 file, +2 / -2 |
| **State** | **MERGED** into `dev` 2026-08-18 as `c09652c693`. Before that: no reviews. Closed once by the author on 2026-08-16 ("cannot reproduce"), reopened after reproducing against the public Dataverse instance on current `dev` (`08d4c8af5d`) |
| **Worktree** | `/Users/jxc755/projects/worktrees/galaxy/pr/23297` |
| **Verdict** | **Approve.** No P1, no P2. The diagnosis is exactly right, the fix is the shape the codebase already uses elsewhere, and it silently fixes a second latent bug. One P3 (a regression test is genuinely cheap here) and two nits. |

---

## The diff

```diff
-                    :current-page="currentPage"
+                    :current-page="usingProvider ? undefined : currentPage"
-                    :per-page="perPage"
+                    :per-page="usingProvider ? undefined : perPage"
```

`client/src/components/SelectionDialog/SelectionDialog.vue:308,316`.

---

## The diagnosis holds, and the archaeology is better than the author's guess

The author says "it might come from the switch of SelectionDialog from BTable to GTable."
That is right, and `git blame` pins it precisely.

**Before the migration** (`5044379dc3c^`, `SelectionDialog.vue`):

```html
<BTable
    :current-page="currentPage"
    :items="itemsProvider ?? items"
    :filter="filter"
    :per-page="perPage"
```

BTable has a **provider mode**: when `items` is a function, `current-page` / `per-page` /
`filter` stop being "slice/filter this array" and become *inputs to the provider context*.
One prop pair, two meanings, switched implicitly by the type of `items`.

**The migration** (`5044379dc3c`, Alireza Heidari, 2026-03-23) removed provider mode —
`SelectionDialog` now calls the provider itself in `loadProviderItems()`
(`SelectionDialog.vue:137-155`) and always hands `GTable` a plain array. Because `GTable`
has no provider mode, the implicit switch had to be re-expressed as explicit booleans, and
the migration added exactly two of them:

```html
:local-filtering="!usingProvider"
:local-sorting="!usingProvider"
```

Paging was the third member of that trio and was not re-expressed. The
`:current-page` / `:per-page` lines both still blame to **guerler, 2024-03** — they are
untouched BTable-era lines that changed meaning underneath the migration. So: **overlooked,
not deliberate.** The author's instinct was correct and worth stating in the PR body.

The double slice itself is real. `GTable.vue:383-390`:

```ts
const paginatedLocalItems = computed(() => {
    if (!props.currentPage || !props.perPage) {
        return localItems.value;
    }
    const startIndex = (props.currentPage - 1) * props.perPage;
    return localItems.value.slice(startIndex, startIndex + props.perPage);
});
```

With `perPage = 25` (`SelectionDialog.vue:85`) and a provider that already returned ≤25 rows,
page 2 evaluates `slice(25, 50)` on a 25-element array → `[]`. Confirmed.

---

## Central question: `undefined` vs. a `local-pagination` prop

Short answer: **`undefined` is the right call here, and I'd argue against adding
`local-pagination` as a condition of merge.** Four reasons, in descending order of weight.

### 1. There is already an in-tree precedent, and it is the newer code

`RemoteFileBrowserContent.vue` is server-paginated — `useRemoteFileBrowser.ts:189-199` sends
`limit`/`offset` and reads `totalMatches` back — and it renders its `GTable` like this
(`RemoteFileBrowserContent.vue:214-226`):

```html
<GTable
    :items="browserItems"
    :fields="browserFields"
    :overlay-loading="isBusy"
    hover striped clickable-rows compact fixed
```

No `current-page`, no `per-page`. Its `BPagination` sits outside the table
(`:total-rows="totalMatches"`, `RemoteFileBrowserContent.vue:301-307`) — structurally
identical to what `SelectionDialog` does at `:390-396`. The convention for "GTable is being
fed one server-supplied page" is therefore already *omit the paging props*. `SelectionDialog`
is the outlier only because it inherited them from BTable. This PR brings it into line with
the existing pattern rather than inventing a new mechanism, which is exactly the answer the
reuse question wants.

The only wrinkle is that `SelectionDialog` has to omit them *conditionally* — it serves both
provider and plain-array callers — and in Vue the way you conditionally omit a prop is to bind
`undefined`. That is what the ternary is.

### 2. `undefined` is documented, not smuggled

Both props are declared optional with an explicit `undefined` default, and the JSDoc says so:

```ts
/**
 * Current page number for pagination (1-based)
 * @default undefined
 */
currentPage?: number;
```

(`GTable.vue:66-71`, `:184-188`; `withDefaults` at `:287` and `:306` both spell out
`undefined`.) So a future contributor adding a default value to these props would be
contradicting the documented contract, not tripping over an undocumented one. The guard in
`paginatedLocalItems` is a deliberate "no paging configured" branch, not an accident of
falsy-checking. The risk the task framing worried about — a later default silently restoring
the bug — is about as low as it gets in an untyped-at-runtime template.

(Nit: the guard is `!props.currentPage`, so `currentPage = 0` also disables paging. `0` is
not a valid 1-based page, so this is harmless, but `=== undefined` would be more honest. Not
this PR's business.)

### 3. A naive `local-pagination` prop would be *more* dangerous, not less

`currentPage`/`perPage` are read in two places, not one. The second is `GTable.vue:490-497`:

```ts
function getGlobalIndex(paginatedIndex: number): number {
    if (!props.currentPage || !props.perPage) {
        return paginatedIndex;
    }
    return (props.currentPage - 1) * props.perPage + paginatedIndex;
}
```

That value feeds row ids, `aria-rowindex`, `isRowSelected`, `isRowIndeterminate`,
`onRowSelect`, `onRowClick`, expanded-row keys and the `actions` slot index —
~20 template sites, `GTable.vue:780-890`.

Meanwhile `SelectionDialog.syncSelectedItems()` (`:117-131`) builds `selectedItems` /
`indeterminateItems` by indexing into `tableItems`, which in provider mode is *the current
page's array*, i.e. indices `0..n-1`. So page-local indices are what GTable must produce for
selection to line up.

The `undefined` fix gets this right for free. A `local-pagination` prop added the obvious way
— gate `paginatedLocalItems` on it, leave `getGlobalIndex` alone — would render the right rows
on page 2 and then mis-highlight every checkbox on it, because `getGlobalIndex(0)` would still
return `25` while `selectedItems` contains `0`. Anyone adding the prop **must** gate both
functions. Worth writing down for whoever eventually does it.

### 4. The prop would carry no information the props don't already carry

`local-filtering` and `local-sorting` are load-bearing beyond the data transform: with
`local-sorting=false`, GTable still uses `sortBy`/`sortDesc` for header arrow state and still
emits `sort-changed` (which `SelectionDialog` forwards to the provider at `:157-160`). The
prop genuinely means "keep the display state, skip the transform."

Pagination has no such split. GTable renders **no** pagination UI — `grep -i pagin GTable.vue`
returns only the two prop docs, `paginatedLocalItems`, `getGlobalIndex` and the `v-for`. The
props exist *solely* to slice and to offset indices. "Disable local pagination" is therefore
exactly equivalent to "don't pass the props," and a boolean would just be a second way to say
the same thing — three props where two are then inert. That is accretion, not abstraction.

### What I'd ask for instead

The real gap is documentation, and it is two lines. Amend the `GTable` JSDoc so the next
provider-backed caller doesn't have to rediscover this:

```ts
/**
 * Current page number for pagination (1-based). Leave undefined when `items`
 * already contains a single server-supplied page -- GTable would otherwise
 * slice it a second time. See RemoteFileBrowserContent.vue.
 * @default undefined
 */
currentPage?: number;
```

and the mirror on `perPage`. That is the "leaves something reusable behind" ask, satisfied at
a tenth the cost of a new prop. Suggestion, not a defect.

---

## Other claims, verified

**"Other file sources with server-side pagination should be affected in the same way."**
True, and the blast radius is bigger than the PR body claims — but it is all fixed by this one
change, because every provider path funnels through `SelectionDialog`. The two callers that
pass `items-provider` are `FilesDialog.vue:299` and `HistoryDatasetPicker.vue:299`. Provider
mode engages per file source via `shouldUseItemsProvider()` (`FilesDialog.vue:342-349`), which
keys off `fileSource.supports.pagination` — so any paginating plugin, not just Dataverse/CKAN.
`HistoryDatasetPicker` uses it unconditionally for both its histories and datasets lists, so
**Import History → Repository is not the only affected surface**; any history/dataset picker
page ≥2 was empty too. Worth a line in the PR body.

**"Choose remote files renders its own GTable with the full list and is unaffected."**
Correct on the conclusion, imprecise on the reason. Two distinct things are unaffected:

- `RemoteFileBrowserContent.vue` — a separate GTable that *is* server-paginated but never
  passes the paging props (see above). Unaffected because it omits them, not because it holds
  the full list.
- `FilesDialog`'s **root** listing — `FilesDialog.vue:263` sets `itemsProvider.value =
  undefined` and `:277` sets `totalItems = convertedItems.length`. That one really is the full
  list, and it is the reason the ternary must stay conditional rather than the props simply
  being deleted.

**No other GTable caller has this bug.** Every `:current-page` binding in the client:
`SelectionDialog.vue:308`, `JobStepJobs.vue:128`, `HistoryDatasetDisplay.vue:82`,
`LibrariesList.vue:66`, `StorageOperationRunView.vue:274`,
`StorageOperationRunsTable.vue:100`, `StorageOperationHistoryView.vue:191,204`. I checked each:
all pass a complete array and drive `BPagination` from `array.length`
(e.g. `StorageOperationRunsTable.vue:177` `:total-rows="props.rows.length"`;
`LibrariesList.vue:328,370,380,413` all `totalRows = <list>.length`). Local pagination is
correct in every one. So the "other call sites are broken too" argument for a shared prop does
**not** apply — which is a further reason the inline fix is proportionate.

`JobStepJobs.vue` is the interesting one: it sets `:local-sorting="false"` (server sorting)
while genuinely wanting local pagination — its `Math.floor(newIndex / props.perPage) + 1` at
`:100` only makes sense over the full list. Confirms the three concerns are orthogonal and
that pagination must never be derived from `localSorting`.

**The pagination bar's total is provider-driven.** `BPagination` at `SelectionDialog.vue:390-396`
uses `:total-rows="totalItems"`, the parent-supplied prop. In provider mode both parents set it
from the server's count: `FilesDialog.vue:365` `totalItems.value = response.totalMatches`
(assigned inside `provideItems`, so it tracks each fetch) and `HistoryDatasetPicker.vue:171,214`
`parseInt(response.headers.get("total_matches") ?? "0")`. No off-by-one: `BPagination` computes
`ceil(totalRows / perPage)`, and 105 items at 25/page → 5 pages, last page 5 items — which is
what the author's "After" screenshot shows. `v-if="totalItems > perPage"` correctly hides the
bar for a single-page result. ✓

**The fix also repairs a second, unreported bug.** As of this PR `getGlobalIndex` returns
page-local indices in provider mode, which is what `syncSelectedItems` produces. Before the
fix those disagreed by `(page-1) * perPage` on every page ≥2. It was invisible only because
those pages rendered zero rows. Anyone who "fixed" the empty pages without touching
`getGlobalIndex` would have shipped broken selection state — see §3. The author should be
credited with this even though the PR body doesn't mention it.

---

## P3 findings

### P3-1 — A regression test is cheap here, and the infrastructure is already sitting next to the file

I would not normally push on tests for a two-line client fix, and I am not calling this
blocking. But the usual objection ("no harness, mounting is a pain") doesn't apply:
`client/src/components/SelectionDialog/SelectionDialog.test.js` already exists, uses vitest +
`@vue/test-utils` `mount`, and **mounts the real `GTable` rather than stubbing it** — it asserts
against rendered DOM like `wrapper.find("input[id^='g-table-select-all-']")`. That is precisely
the integration seam this bug lives in. `SelectionDialog` also exposes what a test needs:
`defineExpose({ resetFilter, resetPagination, currentPage })` at `:263-267`.

There is currently **zero** pagination coverage in any of `SelectionDialog.test.js`,
`FilesDialog.test.ts`, `DataDialog.test.js`, `DatasetCollectionDialog.test.js` — `grep -n
"current-page\|perPage\|pagination"` across all four returns nothing.

A red-to-green test, roughly:

```js
it("renders every provider row on page 2 without re-slicing", async () => {
    const page2 = Array.from({ length: 25 }, (_, i) => ({
        id: `p2-${i}`, label: `file${i}`, isLeaf: true,
    }));
    const itemsProvider = vi.fn().mockResolvedValue(page2);
    await wrapper.setProps({ optionsShow: true, itemsProvider, totalItems: 105 });
    await flushPromises();

    wrapper.vm.resetPagination(2);
    await flushPromises();

    expect(itemsProvider).toHaveBeenCalledWith(
        expect.objectContaining({ currentPage: 2, perPage: 25 }));
    expect(wrapper.findComponent(GTable).findAll("tbody tr")).toHaveLength(25);
});
```

On `dev` that asserts 25 and gets 0. With the patch it passes. Given how invisibly this bug
survived a component migration, and that the next GTable refactor could reintroduce it just as
quietly, the ~15 lines look worth it. Author's call.

### P3-2 — Hoist the ternaries into computeds (style)

The same element reads:

```html
:current-page="usingProvider ? undefined : currentPage"
:local-filtering="!usingProvider"
:local-sorting="!usingProvider"
:per-page="usingProvider ? undefined : perPage"
```

Four bindings expressing one idea in two grammars. `SelectionDialog`'s script section already
prefers named computeds for template-facing derivations (`usingProvider` `:95`, `tableItems`
`:133`, `fieldDetails` `:101`, `okButtonText` `:97`), and there is no other ternary in this
template. Two lines:

```ts
const tableCurrentPage = computed(() => (usingProvider.value ? undefined : currentPage.value));
const tablePerPage = computed(() => (usingProvider.value ? undefined : perPage.value));
```

Genuinely cosmetic — the ternary is clear and I would merge it as-is.

---

## Adjacent, pre-existing, explicitly not this PR's problem

Flagging so they don't get read into this diff. Neither is triggered by any current caller.

**`localFiltering` is dead whenever `localSorting` is false.** `GTable.vue:392-401`:

```ts
const localItems = computed(() => {
    let items = props.items || [];
    if (!props.localSorting) {
        return items;          // <-- returns before the filtering block
    }
    if (props.localFiltering && props.filter && ...) { ... }
```

A caller passing `local-sorting=false` + `local-filtering=true` + a `filter` gets no filtering
and no `filtered` event. Unexposed today: `SelectionDialog` always sets the two to the same
value, and `JobStepJobs` (`local-sorting=false`) passes no filter. But it means GTable's
`local-*` flags are already entangled, and anyone adding a third one should untangle these two
first. Worth a `dev` issue on its own.

**Changing the filter fires two provider requests.** `watch(filter, () => resetPagination())`
(`SelectionDialog.vue:241-243`) is registered *after* the multi-source provider watcher
(`:222-239`), and Vue flushes watchers in creation order. Filtering while on page 3 therefore
fetches `{filter: new, currentPage: 3}` and then `{filter: new, currentPage: 1}`. Only the
second is used — `providerRequestId` (`:142,152`) discards the first — so this is a wasted
round-trip, not a correctness bug. Pagination-adjacent, hence the mention; unrelated to the
diff.

---

## What I could not run

`client/node_modules` is absent in the worktree, so no typecheck and no vitest run. I did not
install it — an `npm ci` in a Galaxy client tree is not a cheap side effect to leave behind, and
nothing about a two-line template change hinges on it. Type-wise the change is safe by
inspection: both props are declared `?: number`, so `number | undefined` is exactly their
declared domain and TS has nothing to complain about. Behaviourally it is safe because
`withDefaults` maps `undefined` → `undefined` for both.

Everything above is from reading source and git history in
`/Users/jxc755/projects/worktrees/galaxy/pr/23297` at `05f14e3882`.

---

## Verdict

**Approve.**

Correct diagnosis, correct root cause, minimal fix, and it matches a pattern the codebase
already established in `RemoteFileBrowserContent`. It also quietly fixes a selection-index bug
that a more "principled" `local-pagination` prop would likely have introduced. No blocking
findings.

Nice-to-have before merge, none of them blocking: the JSDoc note on `GTable`'s
`currentPage`/`perPage` (the one thing that makes this reusable knowledge rather than a local
patch), the regression test in P3-1, and two PR-body corrections — that the migration commit is
`5044379dc3c` and dropped paging while re-expressing filtering and sorting, and that
`HistoryDatasetPicker` is affected too, so the impact is wider than Import History → Repository.

---

## Merged 2026-08-18 — `c09652c693` into `dev`

Merged by jmchilton as reviewed: the single commit `05f14e3882`, `SelectionDialog.vue`
+2/-2, nothing added between review and merge. Verdict was approve with no P1 and no P2, so
nothing was outstanding.

The three nice-to-haves did **not** land, all of them suggestions rather than defects:

- The `GTable` JSDoc note on `currentPage` / `perPage` ("leave undefined when `items` already
  contains a single server-supplied page"). This was the one item that would have turned the
  fix into reusable knowledge instead of a local patch — the next provider-backed caller still
  has to rediscover the double-slice. `GTable.vue:66-71` and `:184-188`.
- The regression test sketched in P3-1. `SelectionDialog.test.js` still has zero pagination
  coverage, and it mounts the real `GTable`, so the seam remains untested. A future GTable
  refactor can reintroduce this as quietly as the BTable migration did.
- Two PR-body corrections: that the migration commit is `5044379dc3c`, and that
  `HistoryDatasetPicker` is affected too so the impact is wider than Import History →
  Repository.

Still open, and explicitly *not* introduced by this PR — flagged during review, would each
need a `dev` issue if anyone wants them:

- `GTable.vue:392-401` — `localFiltering` is dead whenever `localSorting` is false; the
  early return skips the filtering block. No current caller sets that combination with a
  filter, so it is unexposed.
- `SelectionDialog.vue:222-243` — changing the filter fires two provider requests
  (watcher creation order), the first discarded by `providerRequestId`. Wasted round-trip,
  not a correctness bug.

Worktree `~/projects/worktrees/galaxy/pr/23297` kept for now; eligible for `ghwt rm` from
2026-08-21 under the 3-day rule.
