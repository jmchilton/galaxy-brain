### P3 1: The single-pinned-end and `hideEllipsis` windows have no tests (implementation verified)

The window code branches on `firstNumber` and `lastNumber` separately (`lead` and `tail`), but only the layout with both pinned is tested. `hideEllipsis` has no test either, and it is the one prop that changes the item count the window otherwise keeps constant: with it, page 1 shows four page buttons and page 5 shows three.

Add layout tests for `firstNumber` alone, `lastNumber` alone, and `hideEllipsis`, at the start, middle, and end of a 10-page list.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: the review branch adds the three tests, which pass against the PR's window code with hand-derived expectations.

</details>

### P3 2: Out-of-range `limit` and `perPage` are coerced by inconsistent rules (implementation verified)

`safeLimit` turns a `limit` of 0 into one page button and a negative `limit` into the default of 5. `safePerPage` turns a `perPage` of 0 into 20 and a negative one into 1. Both props are typed `number`, and every `BPagination` call site passes a positive bound value, so nothing can depend on these rules. The API parity decision covers the props, not BootstrapVue's handling of invalid values. Two different fallback rules for nonsensical input only add code that has to be explained in a comment.

Clamp both values to at least 1 with one rule and drop the special-case comment.

<details><summary>Details</summary>

```ts
const atLeastOne = (value: number) => Math.max(Math.floor(value) || 1, 1);

const safePerPage = computed(() => atLeastOne(props.perPage));
const safeLimit = computed(() => atLeastOne(props.limit));
```

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: the review branch applies the clamp and adds a test that `limit` 0 and -1 both render a single page button.

</details>

### P3 3: Extract the page-window algorithm from the `items` computed into a pure helper (implementation verified)

`items` holds the whole windowing algorithm: two local closures, a `limit <= 3` regime with `let start/end` adjustments, and an ellipsis regime with three early returns. Inside it, a pinned first or last page is written two ways. The compact regime uses `...(lead && start > 1 ? pages(1, 1) : [])`, and the ellipsis regime uses `...pages(1, 1).slice(0, lead)`, which relies on a 0/1 number serving as both a flag and a slice length. This is the component's only non-trivial logic, and it depends only on the page count, the current page, `limit`, and the pinning and ellipsis flags.

Move it to `client/packages/ui/src/utils/pageWindow.ts`, next to `focusOrder.ts` and `escapeStack.ts`. Write pinned ends one way in both regimes, e.g. `firstPage(show)` / `lastPage(show)`, and keep the 0/1 slot counts only for arithmetic. The component then keeps a single `computed(() => pageWindow({...}))`, and the existing DOM-level layout tests cover the helper unchanged.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: the review branch makes the extraction, and every existing and new layout test passes unchanged.

</details>

### P3 4: The page is set in two places and derived twice, and the reset watcher's page-size exception has no comment (implementation verified)

Both `goTo` and the reset watcher open-code "set `internalPage` and emit `update:modelValue`". `Math.floor(props.modelValue ?? internalPage.value) || 1` appears in `currentPage` and again as `requested` in the watcher. `GTabs` already handles this with a writable `activeIndex` computed that reads the prop or the internal value and whose setter emits. The same pattern fits here.

The watcher's `rows === oldRows` clause means that a page size changing together with the row count keeps the current page, unless the pages shrink past it. This matches BootstrapVue's `pageSizeNumberOfPages` watcher. The description doesn't mention it, though, the code has no comment explaining it, and no test covers it.

Add a `requestedPage` writable computed (getter: bound page or internal page, setter: internal page plus `update:modelValue`), clamp it in `currentPage`, and assign to it from both writers. Comment the simultaneous-change rule and add a test that pins it.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: the review branch adds `requestedPage`, the comment, and a test for a page size and row count changing together. The existing reset and v-model tests still pass.

</details>
