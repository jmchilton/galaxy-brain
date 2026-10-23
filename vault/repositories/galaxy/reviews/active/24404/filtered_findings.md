# Filtered findings — #24404

- test_challenger P3 2 (use a real FK insert instead of a synthetic `FOR KEY SHARE` probe): the reviewer marked it optional, and the probe takes the same lock as an FK check. Not actionable. The strength gap is covered by verified P3 1.
- default P3 2, part about the docstring's "Defaults to False" (the real default is `None`): pre-existing docstring text the PR doesn't touch. Only the lock-mode wording the PR made stale was kept.
