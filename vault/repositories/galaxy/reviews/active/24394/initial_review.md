# Initial review — galaxyproject/galaxy#24394

- Profile: default
- Model: Claude Opus 5.5
- Effort: medium
- Reviewed commit: `c1e5f3fd6e0` (base `release_26.2`)

## Verdict

Approve. The fix is small and correct. It moves sorting out of `GTable`'s display copy and into the staged-items array that the request, collection and pairing code all read, and switches local-file Remove from position to item. I checked it against `client/packages/ui/src/components/GTable.vue`:

- With `localSorting: false`, `localItems` returns `props.items` untouched.
- `sort-changed` fires with the toggled key and direction.
- `sortBy`/`sortDesc` are read only when the table mounts, so passing them back is what restores the arrow after the table unmounts and comes back. The PR describes this correctly.

None of the upload tables uses `filter`, so turning off local filtering loses nothing. No field uses a `formatter`, so dropping formatter-aware comparison changes nothing either. The comparison matches GTable's: null values go last, numbers compare by value, and `Intl.Collator` gives the same result as `localeCompare`.

I found no real bugs, only nits. Tests were not run: the worktree has no `node_modules`.

## Bugs

None found.

## Nits

### P3 1: Comparator duplicates GTable's inline one

`compareValues` in `uploadTableSorting.ts` is a second copy of the comparator inside GTable's `localItems` computed, in `client/packages/ui`, which lives in this repo. The two can drift apart: GTable applies `field.formatter` and this copy doesn't. One option is to export a small `compareTableValues(a, b)` from `@galaxyproject/galaxy-ui` and use it in both places. This is fine as a follow-up rather than on the release branch. It could be folded into the GTable work for #24391, which already needs GTable changes for the same root cause.

### P3 2: Paste Content computes the byte size twice

`PasteContentUpload.vue` now computes `new Blob([content]).size` in two places: the new sort getter (line ~92) and the existing size display helper (line ~155). Pulling out a one-line `contentByteSize(content)` keeps the size that is shown and the size that is sorted on the same.

### P3 3: Optional: `numeric` collation

`new Intl.Collator()` sorts `sample10` before `sample2`, and `Pasted Dataset 10` before `Pasted Dataset 2`. GTable behaves the same way, so this is not a regression. Since the point of the PR is "sort by name to line up `_1`/`_2` files", `new Intl.Collator(undefined, { numeric: true })` would make name sorting more useful for numbered samples. This is the author's call.

## Notes (no action)

- Sort state lives in the component instance. When the user goes to another upload method and comes back, the store restores the items in their sorted order, but the header arrow is gone and new items are appended. This is consistent with "keeps added order until a column is sorted", so I'm only mentioning it.
- The other tables in this codebase use explicit `:local-sorting="false" @sort-changed="..."`, including the browser table in `DataLibraryUpload.vue`. The PR's `v-bind`/`v-on` objects are reasonable for a composable but harder to grep for. Not worth changing.
- Tests: the composable unit tests cover what the component test can't reach easily (missing values last, column accessors, the length watcher). `LocalFileUpload.test.ts` exercises upload order, Remove, files added after sorting, remounting, and the list:paired pairing preview through the real component. That is good coverage. The other four methods only gain wiring that matches local files and have no tests of their own, which is acceptable at this size.
