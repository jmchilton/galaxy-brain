---
upstream_base_branch: release_26.1
---

# issue_24389_lint_duplicate_test_params_26.1

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.1...jmchilton:galaxy:issue_24389_lint_duplicate_test_params_26.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24389_lint_duplicate_test_params_26.1)

## Status

Polished 2026-10-26 at `88151f3a8d6`; waiting for John's final review.

No PR; replaces closed [#24450](https://github.com/galaxyproject/galaxy/pull/24450) (split on bernt-matthias' review).

Fork CI on `88151f3a8d6` pending.

## Decisions

- Split of #24450 (John, 2026-10-26): 26.1 lint-only plus `edit_attributes` dicts fix; rejection at test load goes to [`issue_24389_reject_duplicate_test_params_26.2`](../issue_24389_reject_duplicate_test_params_26.2/index.md).
- `reject_conflicting_duplicates` flag: on for `test_case_validation` (lint), off at test load; off keeps first-at-top-level / last-in-repeat values, as before.
- Kept as its own last commit so the 26.2 branch reverts it.

## History

Built from [`issue_24389_duplicate_test_params_26.1`](../issue_24389_duplicate_test_params_26.1/index.md) (rebased onto `release_26.1` `4d652be1cd8`); its hardening debriefs apply.

[PR description](pr_description.md) · [PR titles](pr_titles.md) · [PR tags](pr_tags.md) · [Polish debrief](polish_debrief.md)
