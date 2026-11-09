- [x] P2 1: Purge SSE test passes without purge event — batcher-delayed upload event satisfies the wait; test reworked to require its own event.
- [x] P2 2: Missing tests for removed users, quota edits/deletes, group membership — added integration + unit tests (`_remove_user_from_group`, group purge still untested).
- [x] P2 3: No E2E test for live masthead meter — added Selenium/Playwright test asserting `.quota-meter` updates after admin quota change.
- [x] P2 4: Quota-change announcements scattered / on RBAC agent — moved announcers into `galaxy.quota`, called from canonical places.
- [x] P3 1: Quota-event queries run with SSE off — skip when live updates disabled instead of nullable sender.
- [x] P3 2: Relabel reruns affected-users CTE — reuse lock statement's user ids on PostgreSQL (fixed, not run locally; CI covers).
- [x] P3 3: `test_quota.py` leaks session listeners — tests now remove them.
- [x] P3 4: SSE test mock keeps only latest handler per type — fan out to all stores, remove on scope dispose.
- [x] P3 5: Storage-usage watcher grows `userStore` — suggest own composable/store (not fixed, >250 lines).
- [x] P3 6: Generalize "dispatch SSE event after commit" — follow-up; `interactivetool.py` hand-rolls same pattern.
- [x] P3 7: PR description NOTE stale — jobs/uploads do send the event now; ask author to update.

Other Actions:
