Expanded scope once to complete runtime new-user restrictions for browser registration, as recommended by the first scope review. Preserved the original implementation at `6a2cdd7f982` on pushed alternative `deployment_test_fixes_26_2_alt_original_scope` (see `alts/original_scope.md`).

`GalaxyTestSeleniumContext.register` now checks `using_requirement("new_user")` before forwarding the existing registration arguments to the reusable navigation implementation. This covers direct calls and the login fallback while leaving configured existing-user login available. The guard stays in `galaxy_test`; reusable browser navigation has no dependency on test policy. The override has typed arguments and the existing `None` result.

The expansion passed normal subagent review (`subagents/rescope_normal_review.md`). Offline checks in `/tmp/check_deployment_registration.py` cover direct registration, login fallback, existing-user login, and argument forwarding with skips disabled/unset. The test-base suite passes (24 tests). Focused mypy on all four changed Python modules matches an archive of release_26.2 exactly after line normalization (708 pre-existing errors in six files). No deployed Galaxy or browser was started.

Archived the first hardening debriefs together in `earlier_drafts/1/`; the initial implementation debrief is retained. Re-hardening reruns every applicable step. Any second scope-change recommendation will be parked for a user decision rather than another automatic expansion.

```text
created /Users/jxc755/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/deployment_test_fixes_26_2/differential-review/snapshots/20261026T222432Z-implementation-9d5f0d32df81.json
  implementation @ 9d5f0d32df81 vs origin/release_26.2 (merge-base cce99870510e)
  since 20261026T221626Z-implementation-075adb64f8bf:
    commits: 2 same, 0 rebased, 0 changed, 2 new, 0 dropped
    hunks:   12 carried, 1 changed, 1 new, 0 dropped
    new     6a2cdd7f9823 Exercise each requirement skip independently in decorator tests
    new     9d5f0d32df81 Honor new-user runtime skips for browser test registration
```
