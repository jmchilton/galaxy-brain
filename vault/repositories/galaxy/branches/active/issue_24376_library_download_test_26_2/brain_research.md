```yaml
documents:
  - path: vault/repositories/galaxy/issues/queued/24376/proposal.md
    why: The issue plan with the verified drift table (selector, zip name), history of the three commits, and notes on download-path leftovers and Playwright differences.
  - path: vault/repositories/galaxy/issues/queued/24376/debrief.md
    why: Lists what is unverified - the test was never run after renaming and the Playwright download difference was not checked.
  - path: vault/research/Component - E2E Tests - Writing.md
    why: Section 11 (Playwright Compatibility) has the per-backend pattern (`self.backend_type`, `@selenium_only(reason)`) and the incompatibility table; it has nothing on browser downloads.
    load_when: Deciding how to handle the download check across Selenium and Playwright; section 8 for wait strategies instead of sleep_for.
  - path: vault/research/Component - E2E Tests Smart Components.md
    why: How navigation.yml selectors and the `data-description` shorthand resolve, for repointing `libraries.folder.download_button`.
    load_when: Fixing the button hook.
  - path: vault/research/Component - Galaxy UI Buttons and Tooltips.md
    why: Download is a GButton, which is `aria-disabled` only; Selenium and Playwright disagree on `is_enabled()`, and `:not([aria-disabled])` is the enabled-wait pattern. Also prefer data-title/data-description over title.
    load_when: Choosing the button selector or waiting for an enabled button.
  - path: vault/repositories/galaxy/branches/active/selenium_history_datatype_citations/index.md
    why: Prior Selenium test branch that adds a `data-description` hook plus a navigation.yml component and helper for a UI action.
    load_when: Following the established pattern for the hook and selector.
  - path: vault/repositories/galaxy/branches/active/selenium_multiview_copy/index.md
    why: Prior branch that replaced dead navigation.yml selectors with real `data-*` hooks and added E2E tests, including a client-side fix found along the way.
    load_when: Replacing a stale selector with a hook in a Vue component.
  - path: vault/research/Component - Deployment Tests.md
    why: Requirement markers (`requires_admin`, `requires_new_library`) used by this test and how Selenium suites run against external servers.
    load_when: Checking decorator behavior or running the test.
  - path: vault/projects/playwright/index.md
    why: Selenium-to-Playwright migration status (#24020); the test must pass under both backends.
    load_when: Running under Playwright.
research_requests: []
# Gap (not queued, one-off detail): no vault note covers browser downloads in E2E tests.
# Only driver_factory.py sets Chrome/Firefox download dirs (DEFAULT_DOWNLOAD_PATH=/tmp/), framework.py:550 get_download_path() returns it,
# and nothing in lib/galaxy/selenium handles Playwright downloads (no expect_download/accept_downloads).
```
