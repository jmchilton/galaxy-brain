- `kind/enhancement` — test-only: new E2E coverage and helpers for existing 26.2 pages; no behavior change.
- `area/testing/selenium`
- `release-testing-26.2`

The labeler also adds `area/testing`, `area/client` and `area/UI-UX` (the five `data-description` hooks under `client/src`). Drop all three: `area/testing/selenium` covers the tests, and the hooks change nothing users see.
