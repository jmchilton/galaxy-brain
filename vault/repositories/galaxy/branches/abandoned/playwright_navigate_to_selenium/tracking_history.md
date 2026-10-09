# Tracking history

Imported from the branch agent on 2026-10-09; this preserves the recorded decisions and evidence. CI has not been refreshed by this migration.

- `playwright_navigate_to_selenium` (`ea73914180e`) — abandoned: its Selenium `navigate_to` retry never fired in `test_change_password.py` yet cost a script call per navigation and had a known false positive (John, 2026-10-06).
