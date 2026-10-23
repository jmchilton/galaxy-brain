# Initial review — #24404

- Profile: `default`
- Model: claude-opus-5-5, effort: medium
- Reviewed commit: `ede9d32e647` (diff vs `origin/release_25.1`)

## Verdict

Approve. One-line, correct, well-justified fix. `with_for_update(skip_locked=True, key_share=True)` compiles to `FOR NO KEY UPDATE SKIP LOCKED` on Postgres (checked with SQLAlchemy 2.0's Postgres dialect). That matches the lock the following `UPDATE ... SET update_time` takes anyway, since `update_time` isn't a key column. `FOR NO KEY UPDATE` doesn't conflict with the `FOR KEY SHARE` that FK checks take, so the deadlock cycle described in the PR is broken. The only callers that reach this branch are on Postgres: `touch_collection_update_time` sends only `postgresql`/`sqlite` to the CTE path, SQLite ignores row locks, and MySQL takes the unlocked Python fallback. So the change carries no cross-dialect risk. No bugs found. Only minor test and comment nits below.

## Findings

### P3 1: Test doesn't prove the HDCA lock is actually held

The new integration test passes whenever `FOR KEY SHARE NOWAIT` succeeds. If the CTE ever stopped matching the HDCA, so no row was locked, the test would still pass and would no longer guard the regression. The PR description says it is red without the fix today, but nothing in the test pins that down. Add a positive check that the row is locked. For example, from the second connection run `SELECT ... FOR UPDATE NOWAIT` and assert it raises `LockNotAvailable` (`sqlalchemy.exc.OperationalError`), or assert that `update_time` changed in the outer session before the rollback. This strengthens the test and doesn't weaken it.

### P3 2: Comments longer than needed; docstring now stale

- The new 4-line comment at `lib/galaxy/model/__init__.py:4850` explains the design rationale, which belongs in the commit or PR body. One line is enough, e.g. `# NO KEY UPDATE: compatible with FK checks' FOR KEY SHARE, avoids deadlocks with inserts referencing HDCAs.`
- The `touch_collection_update_time` docstring (`:4771-4772`) still describes `supports_skip_locked` as "FOR UPDATE SKIP LOCKED". It also says "Defaults to False" while the default is `None`. Small cleanup while touching this.
- The test's 3-line inline comment could likewise be one line.

## Notes (not findings)

- Test placement. `test/unit/data/model/test_touch_collection_update_time.py` already has hierarchy builders (`create_simple_collection_hierarchy`), and `skip_if_not_postgres_uri` exists. But the `unit-postgres` CI workflow only runs a few hand-picked files, so a Postgres unit test would need a workflow edit. Keeping the test in the integration suite (which runs on Postgres in CI) is a reasonable choice.
- Sibling patterns, not touched by this PR, so this is a possible follow-up only. `WorkflowInvocation.cancel_invocation_steps` (`with_for_update()` on `Job`, then updates only `Job.state`) and `jobs/handler.py:156` (`with_for_update(skip_locked=True)` for handler assignment) also take a plain `FOR UPDATE` before non-key updates. Rows referencing `job` (job inputs/outputs, ICJ associations) could hit the same FK-check contention. They would be worth a `key_share=True` audit on dev if similar deadlocks show up.
- The PR says the deadlock is not reproduced on 25.1 itself, since the CI cycle depends on 15f3bf02740 (26.2+). The fix is still safe and strictly less restrictive on 25.1, so targeting the release branch is fine.
