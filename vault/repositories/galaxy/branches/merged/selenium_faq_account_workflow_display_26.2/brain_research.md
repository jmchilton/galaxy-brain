```yaml
documents:
  - path: vault/research/Component - E2E Tests - Writing.md
    why: Describes shared NavigatesGalaxy helpers, integration setup, decorators, and browser assertions for the extracted FAQ coverage.
  - path: vault/research/Component - E2E Tests Smart Components.md
    why: Explains selector scoping and parameterized navigation targets needed when polishing the extracted helpers.
  - path: vault/research/Component - Dataset Display.md
    why: Maps Visualize-tab display applications and their datatype configuration, including old and new display-link variants.
    load_when: Reviewing dataset_display_applications and its BED fixture assertions.
  - path: vault/repositories/galaxy/branches/active/selenium_resume_paused_purge_deleted/implementation_debrief.md
    why: Records storage-dashboard helper conventions, fresh-user setup, state-based waits, and screenshot timing from neighboring coverage.
    load_when: Adapting the disk-usage recalculation helper and storage dashboard test.
  - path: vault/research/Component - User Password Management.md
    why: Explains the reset form and emailed-token flow exercised by the password-reset navigation helpers.
    load_when: Reviewing request_password_reset and reset_password_from_link without adding the release_25.1 bug fix to this branch.
  - path: vault/agents/_shared/GX_PROCESS_POLISH_E2E_TESTS.md
    why: Requires replacing the source helper sleeps and raw DOM selectors with observable waits and navigation abstractions.
  - path: vault/projects/playwright/UPSTREAM_TESTS.md
    why: Defines release_26.2 as the target and explains the missing-coverage QA goal.
research_requests: []
```
