# Filtered findings: PR #24585, round 0 (`71178a56e3b`)

- **Drop `hideEllipsis`, `ellipsisText`, `ellipsisClass`, and the function form of `labelPage`** (default P3 1, part): this re-litigates the BPagination API parity the description calls out. The test-gap part of the finding is kept as P3 1.
- **Grid pager selectors (`aria-posinset`, `.active`) and `.page-link` unit-test selectors won't carry over** (default P3 3; gx_test_challenger forward note): this PR changes no call sites, so nothing needs to change here. The `GridList.vue` and `ToolSuccess` swap PRs must rewrite `navigation.yml` `grid.pager_page`/`pager_page_active` (for example to `[data-page=…]` and `[aria-current="page"]`) and the `.page-link` test selectors. The class props do cover the next/prev/first/last selectors. Worth tracking for the follow-up swap reviews.
- **Render the four first/prev/next/last blocks from `leadingControls`/`trailingControls` computeds** (thermo_review P3 1): when implemented, the data-driven version came out 33 lines longer after Prettier. It trades four short template blocks for object literals with no clear gain.
- **Move focus restoration into `goTo` with `await nextTick()` and drop the watcher** (thermo_review P3 2): disproved. The existing focus test failed because the parent updates the page after the click (an async parent), which only the `currentPage` watcher catches.
- **Attribute-fallthrough test exercises Vue, not GPagination** (gx_test_challenger P3 2): the test guards a contract the component documents (`data-description`/`class` on the `<nav>`), and the grid's selectors rely on it. It is cheap and not trivial enough to act on.
- **Rename "updates the bound page both ways through v-model"** (gx_test_challenger P3 3): a nit-picky test-name change. `modelValue` plus `onUpdate:modelValue` through `h()` is what `v-model` compiles to, so the name is accurate.
- **thermo_review P2 1 downgraded to P3 3 rather than filtered**: this is a readability refactor inside a 426-line component with good DOM-level tests, so it is not a P2 risk.

## Trimmed by John

- **The single-pinned-end and `hideEllipsis` windows have no tests** (verified P3 1): Trimmed by John.
