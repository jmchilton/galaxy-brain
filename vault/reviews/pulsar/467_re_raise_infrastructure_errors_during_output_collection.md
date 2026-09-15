# PR 467 — Re-raise infrastructure errors during output collection

PR: https://github.com/galaxyproject/pulsar/pull/467

Reviewed head: `1eb9aa1c232e0130a70867f3b2b1543f73237420`

## Recommendation

Ready to merge. I found no blocking issues at the current head.

## Follow-up review

Keith's follow-up commit resolves the prior abstraction concern. `_allow_collect_failure`
now accepts the caught exception and owns the decision for the recoverable
`output_workdir` case, including the distinction between a tolerated
`FileNotFoundError` and other `OSError` infrastructure failures. This reuses the existing
policy helper instead of leaving a second output-type policy beside it in
`ResultsCollector._collect_output`.

The surrounding ordering is semantically important and remains correct:

- `ImportError`, `MemoryError`, and `SystemError` are re-raised immediately.
- HTTP 403 is handled before the `OSError` policy because Requests HTTP exceptions derive
  from `OSError`; Galaxy refusing a removed or purged dataset remains recoverable.
- Other `OSError` instances, including transfer and local I/O failures, are not allowed
  for `output_workdir` and are re-raised.
- `FileNotFoundError` remains allowed only for `output_workdir`, preserving the intended
  missing-`from_work_dir` behavior.
- Other output types continue to reject collection failures.

No imports were added inside functions. No tests were removed or weakened. The new tests
cover both sides of the refactored `OSError` decision: infrastructure failure is fatal and
a missing working-directory output remains recoverable. Existing tests cover the special
HTTP 403 path and a fatal non-403 HTTP error.

## Verification

- `tox -e test-unit -- test/client_staging_test.py`: 10 passed
- GitHub reports the PR cleanly mergeable.
- All checks on the current head are green, including lint, MyPy, unit tests across the
  supported Python matrix, CI tests, the resilience suite, framework tests, package build,
  and wheel installation.
- Current `master` has not changed either modified file since the branch point, so there is
  no hidden semantic interaction behind the clean merge result.

## Non-blocking observation

Direct tests for the `ImportError`, `MemoryError`, and `SystemError` tuple would make the
full policy matrix more explicit, but the code path is direct and this is not a reason to
hold the PR.
