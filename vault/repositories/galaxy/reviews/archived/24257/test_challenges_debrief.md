# Test challenges debrief — PR #24257

Reviewed commit d48fe03e0e7 (base merge-base 6cc95b16284, release_25.1). Low effort; tests not run (worktree has no `.venv`).

## Unit tests (`test/unit/app/jobs/test_queue_limit.py`)

- Tests run `queue_with_limit` against a real in-memory model DB (`GalaxyDataTestApp`), not mocked SQL. They exercise observable behavior (queue/refuse), not implementation details. Keep.
- `test_resubmitted_jobs_at_limit` (parametrized over all five limit kinds) is the red-to-green reproducer for the bug: two resubmitted jobs at limit 2 previously blocked each other. Keeps a new-job-is-refused assertion, so the fix isn't just "ignore limits". Good.
- `test_more_resubmitted_jobs_than_destination_user_limit` covers the ordered-drain semantics (`[True, True, False]`, then True after a slot frees). Good; only covers the destination-user limit, which is acceptable since all five subqueries share `other_jobs`.
- Edits to the four existing "at limit" tests are required, not weakening: the job now excludes itself (`id != job.id`), so re-queuing the same job no longer counts itself. Using a second job is the more realistic assertion.
- `Mock()` for the destination is the only mock; fine.
- Minor: the `set_*_limit` helpers are five near-identical one-liners; a `pytest.param(..., id=...)` table with lambdas or (attr, key) tuples would read tighter and give readable test ids. Nit.
- Not covered: a mixed case — a resubmitted job with a lower-id *non-resubmitted* running/queued job, and the documented limitation that a not-yet-ready lower-id resubmitted job holds up higher ids. The limitation is called out in a code comment; a test pinning it is optional.

## API/integration/E2E

- `test/integration/test_job_resubmission.py` + `resubmission_*_job_conf` exist. An integration test with a concurrency limit and several jobs resubmitting at once would be the true reproducer, but the scenario is timing-dependent and the unit test hits the SQL logic directly. Not worth demanding for a release-branch fix.
- No E2E need (backend scheduling only).

## Test plan recommendations

1. (Optional) Collapse `set_*_limit` helpers into parametrize ids.
2. (Optional) Add a case where a non-resubmitted queued job plus resubmitted jobs share the limit, to pin that only resubmitted jobs get the id-ordering exemption.
