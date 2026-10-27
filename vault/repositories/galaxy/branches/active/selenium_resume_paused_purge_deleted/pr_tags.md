- `kind/enhancement` — test-only: new E2E coverage and helpers for existing 26.2 pages; no behavior change.
- `area/testing/selenium`

The labeler also adds `area/testing` (`lib/galaxy_test/**`), `area/client` and `area/UI-UX` (the `client/src` `data-description` hooks and selectors). Drop all three: `area/testing/selenium` covers the tests, and the hooks change nothing users see. Same labels as `selenium_dataset_tags_auto_detect`.
