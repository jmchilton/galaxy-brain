# Planemo morning triage — 2026-10-04

Checked all 25 open PRs and recent issues against GitHub. No new issues or PRs since the October 1 sweep.

## Priorities

- [1707](https://github.com/galaxyproject/planemo/pull/1707): rebased/reviewed head `8e8ca0e4` is green:
  14 successful checks, release upload skipped. Mergeable; still draft. Ready to leave draft and merge.
- [1724](https://github.com/galaxyproject/planemo/pull/1724): rebased branch is mergeable and all 14 checks pass.
- [1700](https://github.com/galaxyproject/planemo/pull/1700): mergeable after rebase, but new October 1
  Galaxy 25.0 CI failure in `test_autoupdate_gxformat2_workflow`.
  Tool installation fails for bgruening/diff revision `02dfbbf869d8` with Galaxy API HTTP 500;
  workflow update never occurs and the expected output assertion fails.
  Investigate/retry this integration failure before attributing it to anonymous API changes.
- [1695](https://github.com/galaxyproject/planemo/pull/1695): still awaiting review; mergeable and green.
- [1715](https://github.com/galaxyproject/planemo/pull/1715): async job submission remains a green,
  mergeable external-author review candidate.

## Remaining conflicts and failures

Only conflicted Planemo PR is older draft [1555](https://github.com/galaxyproject/planemo/pull/1555).
[1704](https://github.com/galaxyproject/planemo/pull/1704) and
[1706](https://github.com/galaxyproject/planemo/pull/1706) retain the same September 14 failures
already diagnosed in the October 1 notes: missing `galaxy.datatypes.html` during container-backed tests.
Both mergeable; no new failure logs to investigate today.

[Galaxy 23829](https://github.com/galaxyproject/galaxy/pull/23829), version-command lint:
open, mergeable; 48 checks passing, seven still running at inspection, one failed integration shard.
Completed failing job errors while starting the Rucio object-store Docker container (exit 125),
which prevents its integration cases from setting up. This is outside the linter changes.

## Local updates

Updated 1707's review note and queue status with green CI. No external reviews, comments, merges,
CI reruns, draft-state changes, or source changes made during this sweep.
