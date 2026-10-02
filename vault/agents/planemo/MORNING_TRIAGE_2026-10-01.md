# Planemo morning triage — 2026-10-01

GitHub states and failing job logs checked today. This is triage, not a full code review.

## Recommended next work

1. [PR 1707](https://github.com/galaxyproject/planemo/pull/1707), inline test jobs outside source directories:
   actual failing regression test `test_composite_data_paths_resolve_to_real_test_data`.
   Expected paths match, but `assert all(os.path.exists(path) for path in paths)` fails.
   Investigate missing `Example_Continuous.imzML` / `Example_Continuous.ibd` fixtures or preparation;
   retain the existence assertion. Draft, otherwise mergeable.
2. Rebase [PR 1700](https://github.com/galaxyproject/planemo/pull/1700), anonymous external Galaxy,
   and [PR 1724](https://github.com/galaxyproject/planemo/pull/1724), invocation filename sanitization.
   GitHub confirms conflicts with master. Older draft
   [1555](https://github.com/galaxyproject/planemo/pull/1555), uvx_galaxy engine, also conflicts.
3. [PR 1695](https://github.com/galaxyproject/planemo/pull/1695), require workflow tests under IWC:
   still in review queue; mergeable, checks passing. `BLOCKED` is not a merge conflict.
   [1697](https://github.com/galaxyproject/planemo/pull/1697) similarly mergeable with passing checks.

## Other red PRs

[1700](https://github.com/galaxyproject/planemo/pull/1700),
[1704](https://github.com/galaxyproject/planemo/pull/1704), and
[1706](https://github.com/galaxyproject/planemo/pull/1706) have September 14 failures showing
`ModuleNotFoundError: No module named 'galaxy.datatypes.html'` during container-backed tool tests.
1704 fails the data-manager Docker mount test; 1700 and 1706 also fail workflow repository installation.
These look like a shared Galaxy/container compatibility problem, not three proven feature regressions.
Rebase/update and verify before changing their implementations.

## New reports and recent work

- No new open Planemo PR since reviewed 1730. [1715](https://github.com/galaxyproject/planemo/pull/1715),
  async jobs-API submission, is an external-author review candidate with passing checks.
- [Issue 1731](https://github.com/galaxyproject/planemo/issues/1731): reporter explicitly says
  containers were downloading slowly; appears resolved, remains open.
- [Planemo PR 1730](https://github.com/galaxyproject/planemo/pull/1730) merged September 30;
  removed from review queue. Worktree is clean but has no upstream, so retained under shared cleanup rules.
- [Galaxy PR 23831](https://github.com/galaxyproject/galaxy/pull/23831), reserved input names,
  merged with passing checks, including the static Cheetah snapshot.
- [Galaxy PR 23829](https://github.com/galaxyproject/galaxy/pull/23829), version-command lint,
  remains open. Python linting passes; current failed mulled job is
  `test_get_singularity_containers`, timing out against `depot.galaxyproject.org`.
  Other checks still running at inspection; no evidence that the linter caused this failure.
- Explicit linter-registration assertion branch was already committed and pushed in this session.

Assigned Planemo issues not previously indexed: 1137 and 135. Added to ISSUES.md for later triage.
No external comments, reviews, merges, CI reruns, or source changes performed during this sweep.
