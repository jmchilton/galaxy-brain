- [x] P2 3: No E2E test for live masthead meter — added Selenium/Playwright test asserting `.quota-meter` updates after admin quota change.
- [x] P2 4: Quota-change announcements scattered / on RBAC agent — moved announcers into `galaxy.quota`, called from canonical places.
- [x] P3 1: Quota-event queries run with SSE off — skip when live updates disabled instead of nullable sender.
- [x] P3 2: Relabel reruns affected-users CTE — reuse lock statement's user ids on PostgreSQL (fixed, not run locally; CI covers).
- [x] P3 3: `test_quota.py` leaks session listeners — tests now remove them.

Other Actions:
