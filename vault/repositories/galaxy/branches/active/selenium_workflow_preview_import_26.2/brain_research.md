```yaml
documents:
  - path: vault/research/Component - E2E Tests - Writing.md
    why: Explains shared Selenium and Playwright tests, integration test configuration, navigation helpers, waits, and API setup used across the public-workflow and TRS cases.
    load_when: Implementing or running the browser tests.
  - path: vault/research/Component - Workflow Import.md
    why: Describes shared-workflow copying and the TRS URL import, deduplication, and provenance paths behind the client import flows.
    load_when: Reviewing import outcomes or diagnosing TRS import failures.
  - path: vault/research/Component - E2E Tests Smart Components.md
    why: Explains how navigation.yml selectors become SmartTarget actions for the preview, run-form, and import buttons.
    load_when: Adding or reviewing selectors and helper methods.
  - path: vault/repositories/galaxy/branches/merged/workflow_open_exact_title/implementation_debrief.md
    why: Records the release-branch workflow card lookup behavior and its exact-title and search-loading constraints; source commit 904094dc011 uses an older helper shape.
    load_when: Adapting workflow_preview_open and the tab-aware card action to release_26.2.
research_requests: []
```
