# selenium_upload_data_library

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:selenium_upload_data_library?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/selenium_upload_data_library)

Base: `release_26.2`.

Missing E2E tests for the 26.2 Upload Activity "Import from Data Library" route (regular user import; list into a picked history), raised by davelopez on [#24399](https://github.com/galaxyproject/galaxy/pull/24399#issuecomment-6367638940).

## Status

Head `a73d90dc50e`: fixes the legacy library contents regression test's mock typing; returned to final review because the branch changed.

PR [#24452](https://github.com/galaxyproject/galaxy/pull/24452) opened 2026-10-25 (not draft), approved by mvdbeek; [description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md).

Fresh fork and PR CI requested by the push; all previous reds were the same branch-caused mypy error. See [ci_diagnosis.md](ci_diagnosis.md).

## Decisions

- 2026-10-23: John asked for these tests on `release_26.2` after davelopez's #24399 comment. #24399's commits (old library folder UI, 26.1) aren't pulled in; they reach 26.2 via the forward merge.
- 2026-10-23: John asked to fix all surfaced bugs on this branch and keep the `start()` wait commit here. Fix commits go after the Baseline + `start()` commits.
