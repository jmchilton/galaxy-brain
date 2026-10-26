STATUS: READY — scoped deployment-test bugs are fixed, reviewed, and pushed; fork CI is queued.

Branch `deployment_test_fixes_26_2` targets `release_26.2`, starts at `cce99870510e`, and is pushed to `jmchilton` at `9d5f0d32df81`. Worktree: `/Users/jxc755/projects/worktrees/galaxy/branch/deployment_test_fixes_26_2`. No PR was opened; handoff is under `branches_implemented_needs_ci`.

Fixed the missing return in `requires_new_published_objects` (which silently removed decorated tests from collection), restored assertion and SkipTest propagation from the base history context manager, replaced obsolete deployment bootstrap arguments with `--dev-wheels`, and corrected the documented URL mapping. The runner now excludes publishing and exports runtime restrictions matching its static selection. Admin-dependent user setup/private-role helpers skip before requests, and the browser test context guards direct/fallback registration with the runtime `new_user` requirement. Optional debug arguments use a quoted Bash array; help documents Celery skipping.

Passing baseline decorator tests are the first commit (`89b8cc3b93a`). Hardening improved their expectations without changing the baseline's position. One scope expansion completed the Selenium registration hook; the original scope is preserved on pushed alternative `deployment_test_fixes_26_2_alt_original_scope` at `6a2cdd7f982`. See `implementation_rescope_debrief.md` and `alts/original_scope.md`. Both normal reviews and fresh test-challenge, maintainability, refactor-baseline, and scope reviews are complete. Final scope review recommends keeping the implementation; no unresolved review finding remains.

Validation:

- All 24 tests in `test/unit/test_base` pass. The baseline file passes against release code (20 tests), while the three published-object regressions fail there at their callable assertion. A direct collection check changes from zero tests before the fix to one afterward.
- Offline checks verify history assertion/skip propagation and cleanup, pre-request admin skips, all nine target/type runner configurations, direct/fallback registration restrictions, existing-user login, and unrestricted registration argument forwarding. Debug=true/false runner variants also pass. Durable helper reproductions are in `test_challenges_debrief.md`.
- `make format`, Python lint hooks, shell syntax, and `git diff --check` pass. Four-module mypy diagnostics exactly match an archive of release_26.2 after normalizing line numbers: 708 pre-existing errors in six files, no new errors.
- The implementation commit skipped only `prettier` and `shell-lint` hooks after checking their pre-existing findings: formatting the existing documentation would rewrite about 700 unrelated lines, and `run_tests.sh` has unchanged shellcheck warnings. No unrelated formatting rewrite was retained; runner array findings were fixed. Later test/registration commits passed all applicable hooks.
- Vault validation: 127 files, zero errors, 15 existing advisory warnings. Project worktree is clean and all commits are pushed. Fork CI on the final head is queued, so no green-CI claim is made.

No deployed Galaxy or production account was used for validation. API history retention/reuse, API timeout scaling, browser-backend migration, deployment targets, and broader test coverage remain separate follow-up choices; this branch does not claim those audit gaps are resolved. E2E/screenshots are inapplicable because this changes test policy and helpers rather than application UI.

```text
created /Users/jxc755/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/deployment_test_fixes_26_2/differential-review/snapshots/20261026T222920Z-hardening-9d5f0d32df81.json
  hardening @ 9d5f0d32df81 vs origin/release_26.2 (merge-base cce99870510e)
  since 20261026T222432Z-implementation-9d5f0d32df81:
    commits: 4 same, 0 rebased, 0 changed, 0 new, 0 dropped
    hunks:   14 carried, 0 changed, 0 new, 0 dropped
```
