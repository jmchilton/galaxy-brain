- `kind/enhancement` — new E2E coverage and test helper cleanup for an existing feature; no product code changes.
- `area/testing/selenium`

The labeler also adds `area/testing` (for `test/functional/tools/sample_datatypes_conf.xml`). Drop it: the datatypes hunk only serves this E2E test, and `area/testing/selenium` covers the change. `area/datatypes` doesn't fit either; only the framework test conf changes.
