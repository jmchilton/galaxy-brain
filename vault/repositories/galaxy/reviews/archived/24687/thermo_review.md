# Thermo review: #24687 Use GPagination in history graph, storage, zip import and upload views

- Profile: thermo_review
- Model: Opus 5.5 (claude-opus-5-5)
- Effort: medium
- Reviewed commit: 82550bcf062518b497ec18ec1603a6871b6c8ece (base `dev`)
- Code was read only, not run, per the profile. Runtime claims below come from reading the code.

## Verdict

No structural regression and no P1. The `.vue` changes are a clean tag swap: 41 added lines, no new branching, no file near 1k lines. The weakness is what the PR leaves behind. It copies one pager block to seven sites and one pager selector pair to eight new specs, with 14 `<BPagination>` sites still to migrate under #23812. Its stated reason for keeping one-way binding is also wrong for one of the views.

Bootstrap classes and `BBadge` staying is fine; the description calls that out and it is outside this change.

## Findings

### P2 1: `usePagination` does not clamp, so the description's reason for one-way binding is wrong for the upload view

The description says these sites "page a local list or a server total that they already clamp themselves, so the page cannot jump back on its own". The server-total site does clamp (`StorageOperationRunView.vue` `watch(maxPage, ...)`). `usePagination` does not: `composables/pagination.ts` has no clamp, and `pagination.test.ts` has no shrinking-list case.

`UploadProgress` is the one consumer whose list shrinks while mounted, through Clear Completed (`uploadState.ts` `clearCompleted`) and row dismissal (`dismissUpload`):

- **Remaining uploads fit on one page:** `showPagination` goes false, the pager unmounts, and `currentPage` stays at 2 or more. `paginatedItems` is then empty, so the list is blank and has no pager. For example, dismissing an errored upload that is the only row on page 2 of 25.
- **Page count shrinks past the current page, pager stays:** `GPagination` shows the clamped last page as current and emits `update:modelValue(1)`, which the one-way binding drops. The list is empty, and clicking the highlighted page does nothing because `goTo` returns early when `page === currentPage`.

This is not a regression. The composable predates the PR and `BPagination` also held its own page. The PR does touch this binding, though, and its rationale rests on a clamp that does not exist.

Fix it in the canonical layer so all five consumers get it:

```ts
// composables/pagination.ts
watch(totalItems, (total) => {
    const lastPage = Math.max(Math.ceil(total / itemsPerPage.value), 1);
    if (currentPage.value > lastPage) {
        currentPage.value = lastPage;
    }
});
```

Add a shrinking-list case to `pagination.test.ts`, red first.

### P2 2: Pager test selectors copied into eight new specs, with no reusable helper

All eight new specs redefine the same strings, as `ToolSuccess.test.ts` already did:

```ts
PAGE_BUTTON: "nav[aria-label='Pagination'] button[data-page]",
CURRENT_PAGE: "nav[aria-label='Pagination'] button[aria-current='page']",
```

Most then repeat the same steps: click `[data-page='2']`, then assert the current page text. That couples nine specs to `GPagination`'s internal DOM, and the 14 remaining sites will add more copies. `GalaxyZipView.test.ts` and `RegularZipView.test.ts` are nearly the same file, differing only in the stub name and component.

Tests are 559 of the PR's 600 added lines, so this is where the PR's accretion is.

Add helpers next to `emittedArg` in `client/tests/vitest/helpers.js`, for example `goToPage(wrapper, n)` and `currentPageText(wrapper)` (or export the selectors from one place). Use them in the eight new specs and `ToolSuccess.test.ts`. Also fold the two zip view specs' shared fixture and flow into one parametrized helper.

### P3 1: Pager wrapper `<div>` and `align` are redundant, and one-way binding keeps `onPageChange` alive

Each site keeps this shape:

```vue
<div v-if="showPagination" class="d-flex justify-content-center py-3 mt-3">
    <GPagination :model-value="currentPage" ... align="center" ... @change="onPageChange" />
</div>
```

`GPagination`'s root `<nav>` is already `display: flex` and honors `align`, and `class` falls through to the `<nav>`. Inside the flex wrapper `align` does nothing, and without the wrapper the flex classes are not needed. The five `usePagination` sites can collapse to:

```vue
<GPagination
    v-if="showPagination"
    v-model="currentPage"
    :total-rows="totalItems"
    :per-page="itemsPerPage"
    align="center"
    size="small"
    first-number
    last-number
    class="py-3 mt-3" />
```

- **Deletes:** a wrapper at each site, and `onPageChange` from the `usePagination` interface once its five consumers stop using it. `currentPage` is already a writable ref.
- **Keep one-way:** `StorageOperationRunsTable` (prop-driven) and `StorageOperationRunView` (server total with its own clamp). Their wrappers can still go.
- **Spacing caveat:** `StorageOperationHistoryView` passes `pagination-class="mt-2 mb-3"`. On the `<nav>`, `mb-3` overrides the pager's default bottom margin instead of adding to it, so check that spacing.

I would not add a `ListPagination` wrapper over `GPagination` for the four repeated static attributes. `GPagination.vue` is already a re-export, and another layer would not earn its keep.

### P3 2: Job pager now duplicated between `ToolExecutionJobs` and `ToolSuccess`

The description calls this "same shape as the tool success page". Both files now have the same 1-indexed bridge computed, the same comment, a nearly identical `GPagination` block (they differ only in the job-count expression and an extra `unselectable` class) and a `.job-pagination` style. They are also the only two users of `JobHeader`'s `pagination` slot.

Extract a small `JobPager.vue` (0-indexed `v-model` plus a job count) and use it in that slot, deleting the computed, comment and CSS from both files. A new component's `v-model` needs the same `compatConfig: { COMPONENT_V_MODEL: false }` that `GPagination` sets.

The copies also diverge. `ToolSuccess` resets its index on `watch(jobResponse)`. `ToolExecutionJobs` never resets when `toolExecutionId` changes, so a stale index past a shorter job list gives `currentJob === null`, and `v-if="currentJob"` hides the header and pager with it. `HistoryGraphNodeBody` does not key the component; I did not check whether anything above it remounts it. This code is pre-existing, and a shared pager is a natural place to fix it.

### P3 3: New scoped CSS replaces utility classes that would still work

`ToolExecutionJobs.vue` swaps `class="mb-0 mr-2"` for `class="job-pagination"` plus a new `<style scoped>` block. `GPagination.vue` makes its margin zero-specificity for exactly this reason: "Zero specificity, so a margin utility class on the component wins". Keeping `class="mb-0 mr-2"` removes seven lines and the file's only style block, and matches the other seven sites in this PR, which keep their utility classes. This goes away if P3 2 is done.

### P3 4: `usePagination` JSDoc example still shows `BPagination`

`composables/pagination.ts:41` has `<BPagination v-if="showPagination" :value="currentPage" @change="onPageChange" />`. After this PR, none of the five consumers use `BPagination`. Update it to `GPagination`, using `v-model` if P3 1 is taken.

## Checked, no finding

- **File size:** no file crosses 1k lines.
- **Dead CSS:** no leftover `.pagination`, `.page-item` or `.page-link` rules in the touched components or `JobHeader`.
- **Selenium:** the only `pagination_*` matches in the part of `navigation.yml` I read are `.list-pagination` selectors, not `BPagination` DOM. The output was truncated to the first ten matches, so this is not exhaustive.
- **`mount(X as object, ...)`:** this cast is an established repo convention (205 test files), so not flagged.
