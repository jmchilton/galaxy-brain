# selenium_upload_data_library

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:selenium_upload_data_library?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_upload_data_library)

Base: `release_26.2`.

Missing E2E tests for the 26.2 Upload Activity "Import from Data Library" route (regular user import; list into a picked history), raised by davelopez on [#24399](https://github.com/galaxyproject/galaxy/pull/24399#issuecomment-6367638940).

## Status

READY. Re-scoped once (alt `selenium_upload_data_library_alt_original_scope`), re-hardened; head `344dc3d6b17`. See `implementation_debrief.md`.

## Decisions

- 2026-10-23: John asked for these tests on `release_26.2` after davelopez's #24399 comment. #24399's commits (old library folder UI, 26.1) aren't pulled in; they reach 26.2 via the forward merge.
