- `kind/bug` — the by-name workflow helpers act on the wrong workflow when another title starts with NAME; framed as missing test coverage for 26.2.
- `area/testing/selenium` — `navigates_galaxy.py`, the Playwright adapter and two E2E test files.

The labeler also adds `area/testing` (any `lib/galaxy_test/**`); drop it, `area/testing/selenium` covers it. The one `navigation.yml` line doesn't warrant a client area.
