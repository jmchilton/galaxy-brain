---
upstream_base_branch: dev
related_records: galaxy/reviews/24801
pr: 25051
---
# gform_input_swap_e2e_tests

- [PR #25051](https://github.com/galaxyproject/galaxy/pull/25051)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/gform_input_swap_e2e_tests)

## Status

Polished 2026-11-22, head `c75f4c0516a` on base `7e7dfea5535`, approved and opened; see the [polish debrief](polish_debrief.md), [description](pr_description.md), [titles](pr_titles.md), [tags](pr_tags.md).

[#25051](https://github.com/galaxyproject/galaxy/pull/25051) opened 2026-11-22, out of draft.

Fork CI green at head; upstream CI pending.

## Scope

Follow-up to the merged [#24801](https://github.com/galaxyproject/galaxy/pull/24801) (`BFormInput` to `GFormInput` swaps), from its unposted [round 0 review](../../../reviews/archived/24801/index.md). John's ask: rebase the review, harden it, and get set up to PR the tests. No behavior change, seven commits:

1. `_show_history_of_datasets` helper for two existing history panel Selenium tests.
2. Baseline test: history panel index range filter (`test_advanced_filter_index_range`).
3. Baseline test: API key show/hide button in `test_api_key`.
4. Baseline test: credentials group-name error (`test_credentials_group_name_error`).
5. Drops Vitest assertions on `GFormInput` classes and pass-through attributes; deletes `APIKeyItem.test.ts`.
6. Types the credentials and filter menu spec fixtures.
7. Types the filter menu text inputs' `filters` prop as `string | undefined`.

Commits 1 to 4 can be split off as a tests-only PR.

## Worktree

`~/projects/worktrees/galaxy/branch/gform_input_swap_e2e_tests/`. E2E runs use the bash runner at `.venv/galaxy_e2e_bash.sh` (zsh is not installed); never pipe its `up` into another command, it hangs.
