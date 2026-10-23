(space for John's free style comments - just keep empty)

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via claude-opus-5-5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via claude-opus-5-5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via claude-opus-5-5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via claude-opus-5-5 at medium effort.

</details>

<details><summary>Risks</summary>

Risks are minimal - this change only weakens a row lock from `FOR UPDATE` to `FOR NO KEY UPDATE` on a column (`update_time`) that isn't a key, adds a Postgres-only integration test, and doesn't lock Galaxy into hard-to-change choices (a two-way door).

<details><summary>Risk Review Advice</summary>

Reviewers should check that nothing relied on the stronger lock to stop concurrent deletes of HDCA rows or changes to their keys while `update_time` is touched. `FOR NO KEY UPDATE` still conflicts with `DELETE` and with key updates, so this looks safe. The plain `UPDATE` that follows takes the same lock mode in Postgres anyway, so the old `FOR UPDATE` was stricter than what the write itself needs. Non-Postgres backends ignore `key_share` or never reach this path. Reverting is a one-line change.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24404_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Branch [`pr_24404_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24404_review_0) is based on the reviewed commit `ede9d32e647`. The branch tightens the PR's Postgres-only integration test. A second probe now asserts the HDCA row really is locked (`FOR UPDATE NOWAIT` fails) while `FOR KEY SHARE NOWAIT` still succeeds. The test body moves inside its `test_history()` context, and the new comments are cut to one line each. The docstring's lock mode now matches the new `FOR NO KEY UPDATE`. The test wasn't run locally because there was no Postgres or venv. It was linted with Galaxy's pinned black 25.9.0 and ruff.

- [`1c4571211f6`](https://github.com/jmchilton/galaxy/commit/1c4571211f6) Assert HDCA lock is held in update_time locking test: adds a `FOR UPDATE NOWAIT` probe that must raise `OperationalError`, so the test fails if the touch locks nothing.
- [`c0a08963e43`](https://github.com/jmchilton/galaxy/commit/c0a08963e43) Run update_time locking test body inside its test history: re-indents the locking block so it runs before history cleanup.
- [`ab457b3ac9e`](https://github.com/jmchilton/galaxy/commit/ab457b3ac9e) Shorten NO KEY UPDATE comments; fix stale lock mode in docstring: makes the model and test comments one line each and updates the docstring to `FOR NO KEY UPDATE SKIP LOCKED`.

</details>

</details>

### P3 1: Test doesn't prove the HDCA lock is actually held

The integration test only checks that `FOR KEY SHARE NOWAIT` succeeds from a second connection. If the CTE ever stopped matching the HDCA, so nothing got locked, the test would still pass and would no longer guard the regression.

Add a positive check from a second connection: `SELECT ... FOR UPDATE NOWAIT` on the HDCA must raise `OperationalError` ("could not obtain lock"). Together the two probes show the row is locked, but only in a mode that FK checks can share. The review branch does this. Galaxy has no local Postgres and no venv here, so the edited test wasn't run. Fixed in [`1c4571211f6`](https://github.com/jmchilton/galaxy/commit/1c4571211f6).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort.

</details>

### P3 2: Test body runs after its test history is cleaned up

The ID decoding and the locking session run after `with self.dataset_populator.test_history()` exits, so they act on a cleaned-up history. It works only because the HDCA rows persist. Move the block inside the `with`. The review branch does this, rolling back the session before the history cleanup. Fixed in [`c0a08963e43`](https://github.com/jmchilton/galaxy/commit/c0a08963e43).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at low effort.

</details>

### P3 3: Comments longer than needed; docstring lock mode now stale (implementation verified)

The new 4-line comment in `_touch_collection_update_time_cte` and the test's 3-line comment explain design rationale that belongs in the PR body. One line each is enough. The `touch_collection_update_time` docstring still says `supports_skip_locked` means "FOR UPDATE SKIP LOCKED", which this PR makes stale.

The review branch cuts each comment to one line and changes the docstring to "FOR NO KEY UPDATE SKIP LOCKED". Fixed in [`ab457b3ac9e`](https://github.com/jmchilton/galaxy/commit/ab457b3ac9e).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>
