### P2 1: No browser test clicks a `BreadcrumbHeading` link (implementation verified)

The breadcrumb is the one link in this PR whose wiring changed beyond a tag swap: named locations are now resolved to a string before reaching `RouterLink`. The unit test pins `href` but not navigation, and nothing in `lib/galaxy_test` or `navigation.yml` targets this component, so step 1 of the manual test plan has no automated equivalent.

Extend `test_history_storage_accessibility`, which already lands on `StorageManager`, by adding a `storage_dashboard.breadcrumb_link` selector and going back through it instead of the second masthead navigation.

<details><summary>Evidence</summary>

The extended test passes under Playwright and Selenium (Chrome) against a built client. With `resolvePath` temporarily returning a bogus path, it fails under Playwright waiting for `[data-description="free-space card"] button` after the breadcrumb click.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 1: `.prevent` is a no-op on the two new `CollectionCreatorIndex` GLinks (implementation verified)

"Try again" and "Create another collection" keep `@click.stop.prevent="resetCreator"`. BLink rendered an anchor with a default action to prevent, but with no `to` or `href` GLink renders a `<button>`, and none of this component's hosts sit in a `<form>`. a47f40fdca9 already dropped the same modifier from sibling `CollectionCreatorNoItemsMessage`.

Use `@click.stop="resetCreator"` on both.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 2: `CollectionCreatorIndex.test.ts` mocks the API module instead of using `useServerMock` (implementation verified)

The client README's API mocking section documents MSW, and sibling specs `ListCollectionCreator.test.ts` and `PairCollectionCreator.test.ts` use it. The `vi.mock` also fakes the failure: it rejects with a string, while the real function throws an `Error` from `rethrowSimple`.

Use `server.use(http.post("/api/dataset_collections", ...))` for both outcomes, and keep the `useHistoryDatasets` mock.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>
