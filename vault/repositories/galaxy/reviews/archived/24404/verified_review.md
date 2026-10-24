### P3 1: Test doesn't prove the HDCA lock is actually held

The integration test only checks that `FOR KEY SHARE NOWAIT` succeeds from a second connection. If the CTE ever stopped matching the HDCA, so nothing got locked, the test would still pass and would no longer guard the regression.

Add a positive check from a second connection: `SELECT ... FOR UPDATE NOWAIT` on the HDCA must raise `OperationalError` ("could not obtain lock"). Together the two probes show the row is locked, but only in a mode that FK checks can share. The review branch does this. Galaxy has no local Postgres and no venv here, so the edited test wasn't run.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort.

</details>

### P3 2: Test body runs after its test history is cleaned up

The ID decoding and the locking session run after `with self.dataset_populator.test_history()` exits, so they act on a cleaned-up history. It works only because the HDCA rows persist. Move the block inside the `with`. The review branch does this, rolling back the session before the history cleanup.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort.

</details>

### P3 3: Comments longer than needed; docstring lock mode now stale (implementation verified)

The new 4-line comment in `_touch_collection_update_time_cte` and the test's 3-line comment explain design rationale that belongs in the PR body. One line each is enough. The `touch_collection_update_time` docstring still says `supports_skip_locked` means "FOR UPDATE SKIP LOCKED", which this PR makes stale.

The review branch cuts each comment to one line and changes the docstring to "FOR NO KEY UPDATE SKIP LOCKED".

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>
