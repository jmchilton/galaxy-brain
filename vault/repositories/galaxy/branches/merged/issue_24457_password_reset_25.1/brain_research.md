```yaml
documents:
  - path: vault/research/Component - User Password Management.md
    why: Traces the emailed reset link through ChangePassword and the legacy controller that logs the user in after saving.
    load_when: Adapting the fix and choosing reset-flow assertions; verify release_25.1 code because the note describes newer dev.
  - path: vault/research/Component - E2E Tests - Writing.md
    why: Explains custom-config Selenium integration tests, session-aware browser helpers, and API setup versus UI assertions.
    load_when: Building the mocked-email regression test; release_25.1 predates the note's dual-backend setup.
  - path: vault/research/Component - E2E Tests Smart Components.md
    why: Documents navigation.yml and SmartTarget abstractions for the login and reset forms.
  - path: vault/agents/_shared/GX_PROCESS_POLISH_E2E_TESTS.md
    why: Requires navigation abstractions, state-based waits, and screenshots for the new reset-flow coverage.
  - path: vault/projects/playwright/UPSTREAM_TESTS.md
    why: Defines the extraction goal and release-targeted QA context for upstreaming galaxy_ui_driver changes.
research_requests: []
```
