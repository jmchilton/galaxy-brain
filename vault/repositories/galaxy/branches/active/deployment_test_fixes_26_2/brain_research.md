```yaml
documents:
  - path: vault/research/Component - Deployment Tests.md
    why: Direct audit of the deployment runner, external-server mode, requirement markers, and the defects this branch addresses.
  - path: vault/research/Component - API Tests.md
    why: API test cases, populators, decorators, and user switching affected by requirement and history fixes.
    load_when: Changing API test helpers or annotations.
  - path: vault/research/Component - Worktree Bootstrapping.md
    why: Startup flags, dependency groups, and external-server test configuration for the release branch runner.
    load_when: Changing deployment setup or validating the runner.
  - path: vault/research/Component - E2E Tests - Writing.md
    why: Browser test lifecycle and helper patterns used by the deployment Selenium selection.
    load_when: Changing Selenium coverage or shared test-history behavior.
research_requests: []
```
