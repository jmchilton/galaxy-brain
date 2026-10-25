# Record file staging metrics for Galaxy job metrics

- [View PR #518](https://github.com/galaxyproject/pulsar/pull/518)
- [View on GitHub](https://github.com/jmchilton/pulsar/tree/pulsar-transfer-metrics)

## Status

Branch `pulsar-transfer-metrics` on `jmchilton`, base `master`; `~/projects/worktrees/pulsar/branch/pulsar-transfer-metrics`.

PR #518 open, mergeable after rebase.

CI pending on `1b89d092d4`.

Draft #529 stacks on it; rebase it onto this head next.

Review notes: [reviews/active/518](../../../reviews/active/518/index.md).

## Notes

Rebased onto `origin/master` (`051b684`) 2026-10-25, force-pushed `a030789fae` -> `1b89d092d4`. Conflicts in `HISTORY.rst` (entries moved under 0.16.1.dev0) and `post.py` imports (master's `staging.models` imports kept; `ClientOutputs` annotation unquoted). Ruff and the branch's metrics tests pass; `manager_coexecution_test::test_simple_execution` fails identically on master (env).
