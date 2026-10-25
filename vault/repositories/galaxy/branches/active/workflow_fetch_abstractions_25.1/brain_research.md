```yaml
documents:
  - path: vault/research/Component - Workflow API.md
    why: Layer map (FastAPI controllers, WorkflowsService, WorkflowsManager, legacy WorkflowsAPIController) and endpoint list incl. delete/undelete/refactor/PUT and bookmark fields.
    load_when: Locating endpoints and service methods to re-route; verify claims against code.
  - path: vault/research/Component - Workflow Refactoring API.md
    why: Refactor PUT route through the service layer; the refactor path is one of the callers being re-routed.
    load_when: Changing WorkflowsService.refactor or its tests.
  - path: vault/projects/wf_refactor_persistence/WF_ACTIONS_PLAN.md
    why: Prior plan that reused the manager getter for refactor.
    load_when: Reading history of which getter refactor uses.
  - path: vault/projects/history_markdown/EMBEDDING_EXTERNAL_PLAN.md
    why: Cites get_stored_accessible_workflow semantics for importable workflows.
    load_when: Checking accessible-getter rules for importable/published workflows.
research_requests: []
```
