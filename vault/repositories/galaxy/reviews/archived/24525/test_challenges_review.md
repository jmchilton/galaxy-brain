# Test challenges review: PR #24525

- Profile: gx_test_challenger
- Model: Claude Opus 5.5, effort low
- Reviewed commit: e37e3605
- Debrief: [test_challenges_debrief.md](test_challenges_debrief.md)

The new vitest is red-to-green (base hits `/api/notebooks/...`) and resolves props through the real router, so it covers the route wiring. Gaps below.

### P2 1: No E2E coverage of notebook sharing page
The bug was a real user-facing breakage (sharing page calling a nonexistent API). No Selenium test exercises page/notebook sharing; history and workflow sharing have them (`test_history_sharing.py`, `test_workflow_sharing.py`). Suggest a Selenium test: create a page with the populator, open `/pages/sharing?id=<id>`, toggle `.make-accessible`, assert via API that the page is importable. Add a `go_to_page_sharing` helper mirroring `go_to_workflow_sharing`.

### P3 1: Vitest mostly asserts URL strings, with heavy mocking
Mocks axios, `@/app`, and `useConfig`, then extracts route props through `route.matched.at(-1)!.props.default as (...)` casts. Once P2 1 lands, consider dropping it or slimming it to the route-props check, with a readable helper for the extraction.

### P3 2: Make the API resource explicit for every sharing route
`resource` is optional and falls back to `pluralName.toLowerCase()`, deriving an API path from a display label. That hidden coupling caused this bug. Passing `resource` on the Visualizations and Workflows routes too, and making it required, removes the fallback and makes any test of the props trivial.
