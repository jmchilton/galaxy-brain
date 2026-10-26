```yaml
documents:
  - path: vault/research/Component - E2E Tests - Writing.md
    why: Browser helpers, API setup patterns, smart selectors and screenshot facilities for verifying the shared-item removal UI.
    load_when: Capturing final screenshots or adjusting recipient-side browser verification.
  - path: vault/repositories/galaxy/branches/active/issue_17204_remove_shared_with_me_26.2/polish_e2e_tests_debrief.md
    why: Records the branch-specific API setup that avoids login screenshot timeouts and the existing recipient-side screenshot checkpoints.
    load_when: Reusing the three existing browser scenarios for screenshots and final validation; historical head hashes are not current.
  - path: vault/research/Component - API Tests.md
    why: Explains the API test harness and authenticated user switching used by the shared-item removal regressions.
    load_when: Rechecking API behavior after the route and manager return annotations.
  - path: vault/research/Component - Workflow API.md
    why: Maps the workflow controller and service layers and existing sharing endpoint conventions.
    load_when: Reviewing the workflow route annotation and bookmark-removal manager override; recipient removal is newer than this note.
research_requests: []
```
