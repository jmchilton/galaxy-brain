# Tracking history

Imported from the branch agent on 2026-10-09; this preserves the recorded decisions and evidence. CI has not been refreshed by this migration.

- Branch `activity_settings_availability` (`6c0307b4b35`, stacked on `shared_activity_availability`) — Description: Activity settings lists only optional activities the user can have: no Upload/Tools for custom-tool users, no disabled Interactive Tools/GalaxyAI; blockers: parent PR #23921 (rebased onto dev 2026-10-08 evening at `c078debd999`, so restack); fork CI on `6c0307b4b35` — Playwright cache miss, full rerun 2026-10-06 hit the cache again; macOS startup red `No module named 'boltons'` is infra (wheels.galaxyproject.org 503 during install); then polish; [debrief](implementation_debrief.md). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:activity_settings_availability?expand=1).
