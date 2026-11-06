# Initial review: #24687

Profile: default. Model: Opus 5.5 (`claude-opus-5-5`). Effort: medium. Reviewed commit: `82550bcf062`.

## Verdict

Mergeable. The swap itself is clean: no regressions, no P1 or P2. Every site's props map to `GPagination` with the same semantics, `@change` still fires only on clicks, and no Selenium or CSS selector targets the old markup in these views. Two P3s are pre-existing bugs next to the swap that the PR's description says don't exist or doesn't mention; the other three are small follow-ups.

Verified by reading code only. The worktree has no `node_modules`, so I didn't run the specs; CI `client-unit-test` is green on this head.

## Bugs next to the swap (pre-existing, not regressions)

### P3 1: `usePagination` doesn't clamp, so Clear Completed can strand the user on an empty page

The PR description says these sites page a list "they already clamp themselves". The storage views do (`StorageOperationHistoryView.vue:144`, `StorageOperationRunView.vue:169`), but the five `usePagination` sites don't: `composables/pagination.ts` never adjusts `currentPage` when `items` shrinks, and only `ZipFileSelector` resets the page itself, on search.

It is reachable on `UploadProgress.vue` through `onClearCompleted`:

- 30 uploads, on page 2, Clear Completed leaves 10: offset 24 slices nothing, `showPagination` is false, so an empty list with no pager to leave it.
- 60 uploads, on page 3, shrink to 30: empty list; `GPagination` clamps its display to page 2 and emits `update:modelValue(1)`, which nobody hears because the site binds one way. Clicking the highlighted 2 is a no-op.

`BPagination` was equally broken (it reset its local page without telling the parent), so this isn't a regression, but the description's claim is wrong.

Fix in `usePagination`, which covers all five sites and the unmounted-pager case that `v-model` wouldn't:

```ts
watch(totalItems, () => {
    const lastPage = Math.max(1, Math.ceil(totalItems.value / itemsPerPage.value));
    if (currentPage.value > lastPage) {
        currentPage.value = lastPage;
    }
});
```

with a case in `composables/pagination.test.ts`.

### P3 2: `ToolExecutionJobs` keeps the job index across tool executions, unlike `ToolSuccess`

The PR calls this site the "same shape as the tool success page", but `ToolSuccess.vue:48` resets `currentIndex` when the response changes and `ToolExecutionJobs.vue:27` doesn't. `HistoryGraphOverview.vue:75` renders `HistoryGraphNodeDetails` unkeyed, so selecting another tool execution node reuses the instance.

- Page 5 of A, then B with 3 jobs: `currentJob` is null, the `v-else-if="currentJob"` branch renders nothing, and the pager goes with it. The details panel is blank.
- Page 2 of A, then B with 3 jobs: B opens on its second job.

Fix: reset `currentIndex` to 0 on `toolExecutionId` change (or key the component on the id), with a case in the new `ToolExecutionJobs.test.ts`.

## Minor

### P3 3: Two pagers on one page share the landmark name "Pagination"

`GPagination` renders a `<nav>` landmark labelled "Pagination" by default. `StorageOperationHistoryView.vue` renders two `StorageOperationRunsTable`s ("In Progress", "Finished"), so with enough runs a screen reader lists two identically named landmarks. The table already has a localized `title` prop and `GPagination` has `ariaLabel`:

```vue
:aria-label="`${props.title} pagination`"
```

### P3 4: Pager test scaffolding is copied into eight new specs with no shared helper

Every new spec redefines the same `PAGE_BUTTON` / `CURRENT_PAGE` selectors and the same click-and-assert steps, as `ToolSuccess.test.ts` already does. With 14 `BPagination` components still to migrate under #23812, this will keep growing. Add the selectors and a `clickPage(wrapper, page)` to `tests/vitest/helpers.js` and use them here. `GalaxyZipView.test.ts` and `RegularZipView.test.ts` differ only in component and stub, and could share a parameterized body.

### P3 5: `usePagination` docstring still shows `BPagination`

This PR moves the last `usePagination` consumers off `BPagination`, leaving the `@example` in `composables/pagination.ts` stale (`<BPagination v-if="showPagination" :value="currentPage" @change="onPageChange" />`). Change it to `<GPagination :model-value="currentPage" ... />`.

## Checked, no finding

- `ToolExecutionJobs` `v-model` through the writable computed matches `ToolSuccess`; `GPagination` opts out of compat's `COMPONENT_V_MODEL`.
- `.job-pagination` in a scoped style reaches the `<nav>` root through the `BaseComponents` re-export. Replacing `mb-0 mr-2` is fine since `:where(.g-pagination)` has zero specificity, and `--spacing-2` matches `mr-2`.
- `StorageOperationRunView` pages from `itemsTotalMatches` and clamps against `failedOrSkippedCount`; the filter resets to page 1 before reloading, so `GPagination`'s unheard page-1 emit changes nothing.
- The new specs mount the real pager and assert which rows are shown, so they aren't prop-passing tests. Coverage gaps are the two findings above, not the swap.
- One-way binding is called out in the description, so I'm not raising it; P3 1's fix doesn't depend on changing it.
- Imports are at the top of each changed file, and no `BPagination` is left in the eight migrated views.
