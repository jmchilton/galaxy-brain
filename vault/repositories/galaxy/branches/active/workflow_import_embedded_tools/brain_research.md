```yaml
documents:
  - path: vault/research/Component - Workflow Import.md
    why: Maps format normalization, subworkflow preloading, step construction, and WorkflowStep persistence; its ToolModule section predates embedded user-defined tools.
    load_when: Designing the import prepass and checking all workflow construction paths.
  - path: vault/research/Component - User-Defined Tools.md
    why: Explains embedded GalaxyUserTool ownership, private dynamic tool storage, and permission boundaries.
    load_when: Resolving or creating embedded tools for the importing user.
  - path: vault/research/Component - Format2 Workflows (gxformat2).md
    why: Traces conversion of format2 YAML into the native workflow step dictionaries consumed by the importer, including nested workflows and output actions.
    load_when: Checking where embedded representations appear after conversion.
  - path: vault/research/Component - Post Job Actions.md
    why: Covers workflow step PJA associations and their persistence path, one trigger for the premature flush.
    load_when: Reviewing the PJA reproduction and step attachment order.
  - path: vault/research/Component - Workflow Testing.md
    why: Points to workflow API upload helpers and import tests for regression coverage.
    load_when: Adding or reviewing the API regression cases.
  - path: vault/repositories/galaxy/branches/merged/workflow_refactor_detached_executor/pr_description.md
    why: Records an earlier detached workflow build session leak involving post-job actions and subworkflow steps.
    load_when: Checking dry-run and refactor behavior around the new prepass.
research_requests:
  - vault/agents/gx_research/todo/workflow_import_embedded_tools.md
```
