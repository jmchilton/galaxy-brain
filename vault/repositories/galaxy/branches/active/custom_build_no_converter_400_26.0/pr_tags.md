- `kind/bug` — a request the server can never satisfy returned a 500 with no cause.
- `area/API`

The labeler also adds `area/testing` and `area/testing/api` for the new test. Drop them: the test only covers the fix.
