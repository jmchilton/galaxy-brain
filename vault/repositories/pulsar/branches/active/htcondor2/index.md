# Add a queued_htcondor manager on the htcondor2 bindings, shared with Galaxy

- [View PR #486](https://github.com/galaxyproject/pulsar/pull/486)
- [View on GitHub](https://github.com/galaxyproject/pulsar/tree/htcondor2)

## Status

Branch `htcondor2` on `galaxyproject`, base `master`; `~/projects/worktrees/pulsar/branch/htcondor2`.

PR #486 open, mergeable.

CI pending on `d35f169c17` (previously green on `7237476cd5`).

Head lives on `galaxyproject:htcondor2` (local branch `htcondor2-rebase`, pushed to `origin/htcondor2`); coordinate with Galaxy #23326.

Review notes: [reviews/active/486](../../../reviews/active/486/index.md).

## Rebase

2026-10-25: rebased onto `origin/master` (67 commits); only conflict was `HISTORY.rst` (kept both entries). Force-pushed `7237476cd5` -> `d35f169c17`. `make lint` and `test/manager_htcondor_test.py` + `test/manager_condor_test.py` pass.
