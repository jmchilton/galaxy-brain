---
upstream_base_branch: release_25.1
---

# Refresh the session after resetting a password (#24457)

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_25.1...jmchilton:galaxy:issue_24457_password_reset_25.1?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24457_password_reset_25.1)

## Status

Polished and opened as PR [#24473](https://github.com/galaxyproject/galaxy/pull/24473) at `b88e76ad2ca`; base `release_25.1` (`bd2cb474a8d`).

PR #24473 is open, approved by dannon; head `b201a506f0c` applies his `location.replace()` nit ([response](review_response_dannon_1.md)).

Fork CI has no reported failures as of 2026-10-25: 18 workflows passed, one skipped, six queued/running; both local Selenium flows passed.

## Merge-forward

From 26.0 on, `ChangePassword` must call `discardActiveConnectionsBeforeAuthNavigation()` before its POST and send `SKIP_PENDING_REQUESTS_HEADER`, like `LoginForm`/`RegisterForm` (dannon, PR comment).

## Handoff

- [PR description](pr_description.md)
- [Title options](pr_titles.md)
- [Recommended labels](pr_tags.md)
- [Polish debrief](polish_debrief.md)

[Implementation debrief](implementation_debrief.md) records the fixes, baseline/regression evidence, reviews and forward-merge reconciliation with the separate 26.2 FAQ branch.
