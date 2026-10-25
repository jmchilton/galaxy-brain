# original_scope

Branch `issue_17204_remove_shared_with_me_26.2_alt_original_scope` at `aca3a3bcea6` (jmchilton fork).

Per-item "Remove from Shared" only: `PUT /api/{histories,workflows,pages,visualizations}/{id}/unshare_with_me`, actions on shared history cards, shared workflow cards and the shared visualizations grid; API, vitest and E2E tests. Hardened (test challenges, E2E polish, Codex, thermo-nuclear, baseline refactor) before scope evaluation recommended expansion.

Differs from parent: no batch removal in the shared lists, no `unshareHistoryWithMe` client wrapper, recipient workflow bookmarks (`StoredWorkflowMenuEntry`) left behind on unshare.
