# Review branch `pr_24404_review_0`

Based on the reviewed commit `ede9d32e647`. The branch tightens the PR's Postgres-only integration test. A second probe now asserts the HDCA row really is locked (`FOR UPDATE NOWAIT` fails) while `FOR KEY SHARE NOWAIT` still succeeds. The test body moves inside its `test_history()` context, and the new comments are cut to one line each. The docstring's lock mode now matches the new `FOR NO KEY UPDATE`. The test wasn't run locally because there was no Postgres or venv. It was linted with Galaxy's pinned black 25.9.0 and ruff.

- `1c4571211f6` Assert HDCA lock is held in update_time locking test: adds a `FOR UPDATE NOWAIT` probe that must raise `OperationalError`, so the test fails if the touch locks nothing.
- `c0a08963e43` Run update_time locking test body inside its test history: re-indents the locking block so it runs before history cleanup.
- `ab457b3ac9e` Shorten NO KEY UPDATE comments; fix stale lock mode in docstring: makes the model and test comments one line each and updates the docstring to `FOR NO KEY UPDATE SKIP LOCKED`.
