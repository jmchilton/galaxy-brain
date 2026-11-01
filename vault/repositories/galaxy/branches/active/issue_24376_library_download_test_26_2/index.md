---
upstream_base_branch: release_26.2
---

# issue_24376_library_download_test_26_2

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:issue_24376_library_download_test_26_2?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24376_library_download_test_26_2)

## Status

Implemented and hardened (re-scoped once), READY; head `f552bcc3656` pushed to `jmchilton`.

No PR yet.

Fork CI not yet run.

## Issue

Fixes [#24376](https://github.com/galaxyproject/galaxy/issues/24376). Issue record: `vault/repositories/galaxy/issues/queued/24376/`.

## Decisions

- Base `release_26.2`: found in 26.2 release testing; matches the other 26.2 Selenium branches. Named `_26_2` because `ghwt` rejects dots.
- Re-scoped to also fix fetched/model-store-imported LDDAs missing `library_dataset` (zip download and LDDA show 500'd). Alt `_alt_original_scope` keeps the test-only version.
- Old rows outside `download()` stay unlinked on this branch; PR text should give the backfill SQL (in `subagents/normal_review_2_rescope.md`); a dev migration is a follow-up.
- Alt `_alt_refactored_history`: same tree, refactor-first history; adopting it or the 3-commit squash in `baseline_refactor.md` needs a force-push.
- The fetch bug also exists on `release_25.1`–`26.1`; a split server-fix PR could target an older branch.

[Implementation debrief](implementation_debrief.md) · [Initial debrief](initial_implementation_debrief.md) · [Re-scope debrief](implementation_rescope_debrief.md) · [Scope evaluation](scope_evaluation.md) · [Test challenges](test_challenges_debrief.md) · [Polish E2E](polish_e2e_tests_debrief.md) · [Performance](performance_challenges_debrief.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Codex review](codex_review.md) · [Baseline refactor](baseline_refactor.md) · [Screenshots](screenshot_debrief.md) · [Issue comment draft](issue_comment_draft.md)
