# Tracking history

Imported from the branch agent on 2026-10-09; this preserves the recorded decisions and evidence. CI has not been refreshed by this migration.

- Branch `playwright_text_table_parity` (approved SHA `1449e639c22`, John 2026-10-05) — Description: Fixes `test_import_dataset_from_path` under Playwright by reading table cells instead of splitting row text; blockers: fork CI on `1449e639c22` — Playwright/Selenium/Integration Selenium failed at "Restore client cache" (fork cache eviction), and the 2026-10-06 evening full reruns hit it again — the change is only exercised by E2E, so it waits for an E2E run that restores the cache; then open as "Run test_import_dataset_from_path under Playwright" (no agent marker). [Description](pr_description.md), [titles](pr_titles.md), [polish debrief](polish_debrief.md). [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:playwright_text_table_parity?expand=1).
