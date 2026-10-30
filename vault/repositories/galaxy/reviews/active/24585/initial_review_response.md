LGTM! -John

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/learning_galaxy.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Profile: gx_risk_assessment · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: `71178a56e3b`

Risks are minimal. This change doesn't lock Galaxy into choices that are hard to change (a two-way door). It adds a new, unused `GPagination` component to `client/packages/ui` and exports it. No call sites, APIs, or user-visible UI change, so reverting means deleting one component and one export line.

<details><summary>Risk Details</summary>

- The main lasting commitment is the component's prop and event surface. It mirrors `BPagination` (`total-rows`, `per-page`, `limit`, `*-text`, `label-*`, the `*-class` props, and the `change` event for clicks only). The 23 follow-up swaps will depend on it, so renaming it later means touching every call site. Until those swaps land, it is cheap to change.
- The component goes back to page 1 when the page size changes or the page count drops below the current page, and emits `update:modelValue`. `BPagination` behaves differently here. Call sites that briefly drop `total-rows` to 0 while loading async data could get bounced to page 1 when they switch over. This is a risk for the follow-up PRs, not this one.
- Focus moves to the current page when the clicked control is disabled or removed. If it is wrong, it only affects keyboard users once the component is adopted, and it is easy to adjust.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should treat the props and events as the API every future pager depends on. Check that the names and the split between `change` (clicks only) and `update:modelValue` are the ones Galaxy wants to keep after BootstrapVue is gone.

Also check the reset-to-page-1 watcher against server-paginated call sites such as the grid lists and the history and dataset lists. Those can update `total-rows` asynchronously, so confirm before the swaps that a load or refetch won't reset a user's page.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/compare/itisAliRH:galaxy:feat/g-pagination...jmchilton:galaxy:pr_24585_review_1) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

[`pr_24585_review_1`](https://github.com/jmchilton/galaxy/tree/pr_24585_review_1) starts from the reviewed commit `71178a56e3b`. Its changes stay inside `client/packages/ui` and leave the component's rendered output and events as they were, except for invalid `limit`/`perPage` values. It clamps out-of-range `limit` and `perPage` with one rule. It moves the page-window algorithm into a pure `utils/pageWindow.ts` helper that writes pinned ends one way. Finally, it routes both page writers through a single writable `requestedPage` computed and comments and tests BootstrapVue's rule for a page size that changes along with the row count. `GPagination.test.ts` grows from 26 to 28 tests. `vue-tsc`, ESLint, and Prettier were clean on the touched files when the commits were first verified.

- [`ec5b99a9be5`](https://github.com/jmchilton/galaxy/commit/ec5b99a9be5) Clamp GPagination's limit and perPage the same way: replaces the two different fallback rules with one `atLeastOne` clamp and adds a test for `limit` 0 and -1 (P3 1).
- [`275eaa00c29`](https://github.com/jmchilton/galaxy/commit/275eaa00c29) Move GPagination's page window into a pure pageWindow helper: moves the `items` algorithm to `utils/pageWindow.ts` with `firstPage(show)`/`lastPage(show)` in both regimes (P3 2).
- [`e20f5281fd3`](https://github.com/jmchilton/galaxy/commit/e20f5281fd3) Write GPagination's page through one writable computed: adds the `requestedPage` getter/setter used by `goTo` and the reset watcher, comments the simultaneous-change rule, and tests it (P3 3).

</details>

</details>

### P3 1: Out-of-range `limit` and `perPage` are coerced by inconsistent rules (implementation verified)

`safeLimit` turns a `limit` of 0 into one page button and a negative `limit` into the default of 5. `safePerPage` turns a `perPage` of 0 into 20 and a negative one into 1. Both props are typed `number`, and every `BPagination` call site passes a positive bound value, so nothing can depend on these rules. The API parity decision covers the props, not BootstrapVue's handling of invalid values. Two different fallback rules for nonsensical input only add code that has to be explained in a comment.

Clamp both values to at least 1 with one rule and drop the special-case comment.

<details><summary>Details</summary>

```ts
const atLeastOne = (value: number) => Math.max(Math.floor(value) || 1, 1);

const safePerPage = computed(() => atLeastOne(props.perPage));
const safeLimit = computed(() => atLeastOne(props.limit));
```

</details>

Fixed on the review branch in [`ec5b99a9be5`](https://github.com/jmchilton/galaxy/commit/ec5b99a9be5).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: the review branch applies the clamp and adds a test that `limit` 0 and -1 both render a single page button.

</details>

### P3 2: Extract the page-window algorithm from the `items` computed into a pure helper (implementation verified)

`items` holds the whole windowing algorithm: two local closures, a `limit <= 3` regime with `let start/end` adjustments, and an ellipsis regime with three early returns. Inside it, a pinned first or last page is written two ways. The compact regime uses `...(lead && start > 1 ? pages(1, 1) : [])`, and the ellipsis regime uses `...pages(1, 1).slice(0, lead)`, which relies on a 0/1 number serving as both a flag and a slice length. This is the component's only non-trivial logic, and it depends only on the page count, the current page, `limit`, and the pinning and ellipsis flags.

Move it to `client/packages/ui/src/utils/pageWindow.ts`, next to `focusOrder.ts` and `escapeStack.ts`. Write pinned ends one way in both regimes, e.g. `firstPage(show)` / `lastPage(show)`, and keep the 0/1 slot counts only for arithmetic. The component then keeps a single `computed(() => pageWindow({...}))`, and the existing DOM-level layout tests cover the helper unchanged.

Fixed on the review branch in [`275eaa00c29`](https://github.com/jmchilton/galaxy/commit/275eaa00c29).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: the review branch makes the extraction, and every existing and new layout test passes unchanged.

</details>

### P3 3: The page is set in two places and derived twice, and the reset watcher's page-size exception has no comment (implementation verified)

Both `goTo` and the reset watcher open-code "set `internalPage` and emit `update:modelValue`". `Math.floor(props.modelValue ?? internalPage.value) || 1` appears in `currentPage` and again as `requested` in the watcher. `GTabs` already handles this with a writable `activeIndex` computed that reads the prop or the internal value and whose setter emits. The same pattern fits here.

The watcher's `rows === oldRows` clause means that a page size changing together with the row count keeps the current page, unless the pages shrink past it. This matches BootstrapVue's `pageSizeNumberOfPages` watcher. The description doesn't mention it, though, the code has no comment explaining it, and no test covers it.

Add a `requestedPage` writable computed (getter: bound page or internal page, setter: internal page plus `update:modelValue`), clamp it in `currentPage`, and assign to it from both writers. Comment the simultaneous-change rule and add a test that pins it.

Fixed on the review branch in [`e20f5281fd3`](https://github.com/jmchilton/galaxy/commit/e20f5281fd3).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort: the review branch adds `requestedPage`, the comment, and a test for a page size and row count changing together. The existing reset and v-model tests still pass.

</details>
