---
upstream_base_branch: release_26.2
parent_branch: issue_24389_lint_duplicate_test_params_26.1
---

# issue_24389_reject_duplicate_test_params_26.2

- [Open PR](https://github.com/jmchilton/galaxy/compare/issue_24389_lint_duplicate_test_params_26.1...issue_24389_reject_duplicate_test_params_26.2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24389_reject_duplicate_test_params_26.2)

## Status

Polished 2026-10-26 at `f9f918beb13` (one commit reverting the parent's flag commit); waiting for John's final review.

No PR; open against `release_26.2` only after the parent merges and is merged forward, then rebase onto `release_26.2` and drop `parent_branch`.

Fork CI on `f9f918beb13` pending; re-run duplicates tests after rebase onto `release_26.2` (`_qualify_test_inputs` there).

## Decisions

- Split of #24450 (John, 2026-10-26): this carries the test-behavior change to 26.2.
- PR body must name tools-iuc sourmash sketch (25.0) and isoformswitchanalyzer (25.1), which error at load after this.

[PR description](pr_description.md) · [PR titles](pr_titles.md) · [PR tags](pr_tags.md) · [Polish debrief](polish_debrief.md)
