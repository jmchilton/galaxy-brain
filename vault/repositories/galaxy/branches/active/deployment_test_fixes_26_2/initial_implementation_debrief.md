Implementation complete; hardening pending. Branch `deployment_test_fixes_26_2` starts from `origin/release_26.2` at `cce99870510e`.

Fixed the missing published-object decorator return, history context suppression of assertions/skips, runner dependency installation on release branches, optional debug handling, runtime capability exclusions, and stale URL mapping documentation. Added admin guards to user setup (including named second-user switches) and private-role lookup. Publishing is excluded statically and at runtime. Normal review found no correctness defects; its Celery help recommendation was implemented.

Baseline decorator execution/skip tests passed before implementation and were committed first (`89b8cc3b93a`). Regression cases for the broken decorator failed before the fix. The complete test-base unit suite passes (24 tests). `/tmp/check_deployment_fixes.py` verifies history assertion/skip propagation and cleanup, admin guards before server access, and nine stubbed target/type runner configurations. No deployed server was contacted.

`make format` passed. Focused mypy reports the same 564 errors across five files on this branch and an archive of the release base; comparison is in progress. Commit hooks passed except deliberately skipped prettier (pre-existing whole-document drift) and shell-lint (existing run_tests warnings and environment source resolution); deployment runner array warnings were fixed. No unrelated formatter rewrite was retained.

Broader audit observations remain scope choices: API history lifecycle, API timeout scaling, Selenium registration guards, browser-backend migration, and expanding deployment coverage/targets.

```text
created /Users/jxc755/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/deployment_test_fixes_26_2/differential-review/snapshots/20261026T221626Z-implementation-075adb64f8bf.json
  implementation @ 075adb64f8bf vs origin/release_26.2 (merge-base cce99870510e)
  first snapshot: 2 commits, 7 files, 13 hunks
```
