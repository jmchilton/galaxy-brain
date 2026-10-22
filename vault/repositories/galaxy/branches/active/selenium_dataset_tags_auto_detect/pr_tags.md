- `kind/enhancement` — test-only: new E2E coverage and helpers for existing 26.2 pages; no behavior change.
- `area/testing/selenium`

The labeler also adds `area/testing` (`lib/galaxy_test/**`), `area/client` and `area/UI-UX` (the `client/src` id and selectors). Drop all three: `area/testing/selenium` covers the tests, and the id changes nothing users see. Same labels as `selenium_history_datatype_citations`, minus `release-testing-26.2`, which marks PRs for manual release testing; a test-only PR has nothing to test by hand.
