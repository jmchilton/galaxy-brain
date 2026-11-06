

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Opus 5.5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24685_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Branch [`pr_24685_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24685_review_0), from reviewed commit `150cb834122`, adds browser coverage for the one link whose wiring changed, the `BreadcrumbHeading` link, by going back through it in `test_history_storage_accessibility`. It also tidies the PR's unit tests: the new `CollectionCreatorIndex` spec uses MSW instead of mocking the API module, the `DatasetDetails` test is reduced to what E2E can't see, and assertions on `GLink`'s class and element are gone. The `CollectionCreatorIndex` GLinks lose a no-op `.prevent`. There are no other production changes.

- [`4d58215bb82`](https://github.com/jmchilton/galaxy/commit/4d58215bb82) Drop no-op .prevent from CollectionCreatorIndex GLinks: `@click.stop.prevent` becomes `@click.stop` on "Try again" and "Create another collection".
- [`3bb64ff4f45`](https://github.com/jmchilton/galaxy/commit/3bb64ff4f45) Cover BreadcrumbHeading navigation in storage dashboard E2E: adds a `storage_dashboard.breadcrumb_link` selector and clicks it from `StorageManager` in place of the second masthead navigation.
- [`8741677b84e`](https://github.com/jmchilton/galaxy/commit/8741677b84e) Focus DatasetDetails dbkey test on what only it covers: replaces the wrapper template with the file's `shallowMount` pattern and keeps the edit emit and `.stop` checks.
- [`399197aadb9`](https://github.com/jmchilton/galaxy/commit/399197aadb9) Mock the collection create API with MSW in CollectionCreatorIndex spec: failure and success now go through the real API function, using `useServerMock`.
- [`52762db7f56`](https://github.com/jmchilton/galaxy/commit/52762db7f56) Drop assertions on GLink internals from migrated specs: removes the `.g-link` and `tagName` assertions and finds links by `button` and text.

</details>

</details>

### P2 1: No browser test clicks a `BreadcrumbHeading` link (implementation verified)

The breadcrumb is the one link in this PR whose wiring changed beyond a tag swap: named locations are now resolved to a string before reaching `RouterLink`. The unit test pins `href` but not navigation, and nothing in `lib/galaxy_test` or `navigation.yml` targets this component, so step 1 of the manual test plan has no automated equivalent.

Extend `test_history_storage_accessibility`, which already lands on `StorageManager`, by adding a `storage_dashboard.breadcrumb_link` selector and going back through it instead of the second masthead navigation.

<details><summary>Evidence</summary>

The extended test passes under Playwright and Selenium (Chrome) against a built client. With `resolvePath` temporarily returning a bogus path, it fails under Playwright waiting for `[data-description="free-space card"] button` after the breadcrumb click.

</details>

Fixed on the review branch in [`3bb64ff4f45`](https://github.com/jmchilton/galaxy/commit/3bb64ff4f45).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 1: `.prevent` is a no-op on the two new `CollectionCreatorIndex` GLinks (implementation verified)

"Try again" and "Create another collection" keep `@click.stop.prevent="resetCreator"`. BLink rendered an anchor with a default action to prevent, but with no `to` or `href` GLink renders a `<button>`, and none of this component's hosts sit in a `<form>`. a47f40fdca9 already dropped the same modifier from sibling `CollectionCreatorNoItemsMessage`.

Use `@click.stop="resetCreator"` on both.

Fixed on the review branch in [`4d58215bb82`](https://github.com/jmchilton/galaxy/commit/4d58215bb82).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 2: `CollectionCreatorIndex.test.ts` mocks the API module instead of using `useServerMock` (implementation verified)

The client README's API mocking section documents MSW, and sibling specs `ListCollectionCreator.test.ts` and `PairCollectionCreator.test.ts` use it. The `vi.mock` also fakes the failure: it rejects with a string, while the real function throws an `Error` from `rethrowSimple`.

Use `server.use(http.post("/api/dataset_collections", ...))` for both outcomes, and keep the `useHistoryDatasets` mock.

Fixed on the review branch in [`399197aadb9`](https://github.com/jmchilton/galaxy/commit/399197aadb9).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 3: `DatasetDetails` test can shrink to what only it covers (implementation verified)

`test_dataset_change_dbkey` already clicks `.dbkey .value` and waits for the edit form, so the `tagName`, `.value` and `text` assertions duplicate it. What E2E wouldn't notice is `.stop` keeping the click from reaching the history item, and checking that doesn't need the inline wrapper template.

Use the file's `shallowMount` with `stubs: { GLink: false }` and a native listener on the root element, keeping the `edit` emit and propagation assertions.

<details><summary>Evidence</summary>

The rewritten test passes, and fails on the propagation assertion when `.stop` is temporarily removed from `DatasetDetails.vue`.

</details>

Fixed on the review branch in [`8741677b84e`](https://github.com/jmchilton/galaxy/commit/8741677b84e).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 4: Assertions pin GLink's class and repeat its element (implementation verified)

`toContain("g-link")` (`BreadcrumbHeading.test.ts` twice, `PersistentTaskProgressMonitorAlert.test.ts`) and `findLinkByText`'s `.g-link` lookup pin GLink's internal class, so they'd fail on a GLink refactor with no behavior change here. The `tagName` checks (`CollectionCreatorIndex.test.ts` twice, `PersistentTaskProgressMonitorAlert.test.ts`) are redundant: the `href` assertion already implies the anchor, and a `button` lookup implies the button.

Drop them, and have `findLinkByText` look up `button` by text.

Fixed on the review branch in [`52762db7f56`](https://github.com/jmchilton/galaxy/commit/52762db7f56).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>
