- `kind/enhancement` — new per-column test hooks and copy helper for an existing feature. The dead selectors it fixes were never called, so nothing visible was broken.
- `area/testing/selenium`

The labeler also adds `area/client`, `area/UI-UX` and `area/testing` for the two Vue attributes and the test file. Drop them: no UI behavior changes, and `area/testing/selenium` already covers the test.
