# Review branch `pr_24687_review_0`

This branch sits on the reviewed commit `82550bcf062`. It fixes two pre-existing bugs next to the swap: `usePagination` not clamping when its list shrinks, and `ToolExecutionJobs` keeping the job index across executions. It extracts `JobPager` from the two job pagers, names the pager landmarks that share a page, and adds the first browser tests that reach a migrated pager, one through the zip wizard and one through the history graph's tool executions tab. The rest is spec cleanup: shared pager helpers, fewer mocks, a stronger row assertion, and removal of the jsdom paging specs that the zip browser test replaces.

- `3ecb1e21406` Share GPagination spec helpers: moves the copied selectors and click steps in nine specs into `tests/vitest/helpers.js`.
- `5d6396293dc` Run UploadProgress spec on real upload state: drops the three module mocks and the hand-copied list shape.
- `cc43c49f922` Clamp usePagination when its list shrinks: adds a watcher on the total, with composable cases and a real Clear Completed case, red first.
- `634af3ab280` Reset job pager when ToolExecutionJobs switches execution: adds a watcher on `toolExecutionId`, with a spec for fewer and equal job counts, red first.
- `1337e11bc0e` Extract JobPager from the two job pagers: adds `JobInformation/JobPager.vue` and removes the bridge, pager block and scoped styles from both parents.
- `ef34cca0094` Show GPagination in the usePagination docstring: corrects the `@example`.
- `809da7251f6` Name the pager landmarks that share a page: gives the storage runs tables and tool execution pagers their own `aria-label`.
- `f2ada02a421` Use MSW in the storage operation specs: replaces the API and store mocks, keeping only `useStorageRunWatcher`.
- `eee5ef9da55` Assert which rows the storage runs table shows: checks that page 2 shows runs 3 and 4.
- `a168a71bd6c` Share zip spec fixtures, drop getImportableFiles mock: uses a fake explorer and one parameterized view spec.
- `edf04ff130e` Drop the ZipImportSummary no-pager spec: removes a test that restates `showPagination`.
- `8aa3060b670` Page a large archive through the zip wizard in Selenium: adds the test, a 30-file fixture, helpers and selectors, removes the three replaced paging specs, and folds the zip fixtures back into `GalaxyZipView.test.ts`.
- `4fd1a06ee6c` Page tool execution jobs in the history graph in Selenium: adds `test_history_graph.py` and a `history_graph` navigation component.
