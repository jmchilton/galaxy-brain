# Test challenges review — PR #24513

- Profile: gx_test_challenger
- Model: Opus 5.5
- Effort: low
- Reviewed commit: 30b808629416e02e14a12efa3d3493b49c23ffb1

New vitest file `RemoteFilesUpload.test.ts` is solid: mounts the real component, mocks at the API boundary, drives real clicks/search/pagination, asserts listing counts. All five cases kept. No E2E requested (release-branch fix; server-paginated sources impractical in Selenium). Details: [test_challenges_debrief.md](test_challenges_debrief.md).

## P2 1: Client-side search/pagination branch untested after watcher removal

`useFileSources` is mocked with `supportsPagination`/`supportsSearch` always true, so only the server-side branch runs. The PR removed the `currentPage`/`searchQuery` watchers; for sources without server search/pagination (e.g. posix), paging and filtering now depend solely on `onPageChange`/`updateSearchQuery` calling `updateClientSideView`. A regression there (page 2 showing page 1's rows) would pass this suite.

Suggested fix: parametrize the mock flags (`describe.each`) and add a case with both false: open a folder with >25 entries, go to page 2 and search; assert rendered rows change and the folder is listed once.

## P3 1: `startUpload` reset reload untested

`startUpload` now explicitly sets `currentPage = 1` and calls `load()` (previously watcher-driven). Add a small case: navigate into a folder/page 2, call exposed `startUpload()`, assert one root listing and page reset.
