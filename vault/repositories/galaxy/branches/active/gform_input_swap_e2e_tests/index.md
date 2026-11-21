---
upstream_base_branch: dev
related_records: galaxy/reviews/24801
---
# gform_input_swap_e2e_tests

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:gform_input_swap_e2e_tests?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/gform_input_swap_e2e_tests)

## Status

Rebased from the unposted #24801 review branch onto `dev` 2026-11-21; hardening in progress.

No PR yet.

## Scope

Follow-up to the merged [#24801](https://github.com/galaxyproject/galaxy/pull/24801) (`BFormInput` to `GFormInput` swaps), carrying the six fixes from its [round 0 review](../../../reviews/archived/24801/index.md), which was never posted. John's ask: rebase the review and get set up to PR the tests.

1. Selenium test of the history panel index range filter (`test_advanced_filter_index_range`).
2. Drops Vitest assertions on `GFormInput` classes and pass-through attributes.
3. Checks the API key show/hide button in Selenium `test_api_key`; deletes `APIKeyItem.test.ts`.
4. Types the credentials and filter menu spec fixtures.
5. Shares the filter menu text conversion (`useFilterText`).
6. Selenium test of the credentials group-name error (`test_credentials_group_name_error`).

## Worktree

`~/projects/worktrees/galaxy/branch/gform_input_swap_e2e_tests/`.
