### P2 1: No end-to-end test that a sorted List of Pairs is built in table order

The bug is about what reaches Galaxy: request order and forward/reverse pairing. The vitest tests stop at `prepareUpload()` and the pairing preview. Nothing checks a real `list:paired` collection built after sorting.

The review branch adds `test_upload_paired_list_in_sorted_order` to `test_uploads.py`. It stages `2.tabular` then `1.tabular` as local files, sorts by Name, uploads as List of Pairs, and checks through the API that `forward` holds `1.tabular`'s content and `reverse` holds `2.tabular`'s. To support this, the branch adds a reusable `sort_by(field)` method to the upload activity helpers (`upload_activity_helpers.py`) and a `table_sortable_header` selector to `navigation.yml`. The test was written but not run, because it needs a running Galaxy. Ruff, black and flake8 pass, and `navigation.yml` loads.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort.

</details>

### P3 1: Sorting is wired into four methods with no test (implementation verified)

Only Local Files tests that sorting reaches the upload. Paste Content also gains a new sort accessor for Size, a column that didn't sort before. Paste Links, Remote Files and Data Library only gain the same wiring.

The review branch adds two tests:

- `PasteLinksUpload.test.ts`: sorting by Name reorders `prepareUpload()`.
- `PasteContentUpload.test.ts` (new): sorting by Size reorders `prepareUpload()`.

Remote Files and Data Library are still not covered.

<details><summary>Evidence</summary>

Removing `v-bind="tableSortProps"` and `v-on="tableSortEvents"` from each component makes its new test fail. With the wiring in place, both tests pass.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 2: `compareValues` copies GTable's comparator and has already drifted (implementation verified)

`compareValues` in `uploadTableSorting.ts` is a second copy of the comparator inline in GTable's `localItems` (`client/packages/ui/src/components/GTable.vue`), and the two already differ:

- **Missing values.** GTable returns early for missing values before it applies `sortDesc`, so they stay last in both directions. `applySort` multiplies the whole result by the direction, so a descending sort puts missing values first. The PR description says missing values go last, the same way GTable does it.
- **Formatters.** GTable applies `field.formatter` before comparing; this copy doesn't.

Today the sortable staged columns (Name, Size) are typed non-null, so users probably can't hit the descending case yet. The next optional sortable column would expose it.

The review branch passes the direction into `compareValues`, leaves the missing-value checks unflipped, and adds a descending case to the composable test. A shared `compareTableValues(a, b)` exported from `@galaxyproject/galaxy-ui` and used by both GTable and the composable would stop further drift. That changes the shared UI package, so it fits better as a `dev` follow-up, perhaps together with the GTable work for #24391.

<details><summary>Evidence</summary>

The new assertion (`onSortChanged("size", true)` should give `["ten", "two", "none"]`) fails on the reviewed commit with `['none', 'ten', 'two']` and passes with the fix.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 3: Paste Content computes the byte size in two places (implementation verified)

`PasteContentUpload.vue` computes `new Blob([content]).size` in two places: the new Size sort accessor and the existing `getItemSize` display helper. If one changes and the other doesn't, the size the table shows and the size it sorts on can differ. The review branch adds a `contentByteSize(content)` helper and uses it in both places.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 4: Two composable tests repeat the component tests (implementation verified)

Two tests in `uploadTableSorting.test.ts` repeat Local Files tests that run through the real component:

- "sorts the items in place by the selected column" matches "uploads files in the order the sorted table shows", including descending order.
- "applies the active sort to items added later" matches "keeps files added after sorting in sorted order". The component test also exercises the length watcher.

The review branch drops both. It keeps the comparator edge cases (numbers, missing values last, column accessors) and "keeps the added order until a column is sorted".

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 5: The `uploadDefaults` mock is copied between test files (implementation verified)

`LocalFileUpload.test.ts` copies the inline `vi.mock("@/composables/upload/uploadDefaults", ...)` block from `PasteLinksUpload.test.ts`. The review branch moves it to `client/src/composables/upload/__mocks__/uploadDefaults.ts`, following the existing `composables/__mocks__` convention. The three method tests now use it with a bare `vi.mock(...)`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>
