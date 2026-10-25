- `kind/bug`
- `area/upload`
- `area/libraries`
- `area/testing/selenium`
- `area/UI-UX`

The labeler also adds `area/testing` (from `lib/galaxy_test/**`); `area/testing/selenium` is enough. It doesn't add `area/upload` or `area/libraries` (no `LibraryFolder/` or `api/libraries.py` changes), but they're the center of the change. `area/UI-UX` covers the truncation and the galaxy-ui tooltip change. `area/API` is left off: the schema change is a nullable field, not new API.
