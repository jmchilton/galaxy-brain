# Brain Research YAML Format

`BRANCH_DIRECTORY/brain_research.md` lists galaxy-brain documents relevant to a branch, for later agents to load as needed. It holds one ```` ```yaml ```` fenced block.

````markdown
```yaml
documents:
  - path: vault/research/Component - Post Job Actions.md
    why: How PJAs are attached to workflow steps; the fix changes when they run.
    load_when: Implementing or reviewing the PJA ordering change.
  - path: vault/projects/workflow_state/index.md
    why: Prior work on pre-execution parameter typing in the same module.
research_requests:
  - vault/agents/gx_research/todo/workflow_scheduling.md
```
````

`documents` entries:

| Field       | Required | Value                                                              |
|-------------|----------|--------------------------------------------------------------------|
| `path`      | yes      | Repository-relative path to a file under `vault/`.                 |
| `why`       | yes      | One line: what it tells you about this branch's change.            |
| `load_when` | no       | Which step or question it helps; omit when it applies throughout.  |

`research_requests` lists the [research requests](GX_QUEUING_RESEARCH.md) written or extended for this branch. Either list may be empty. Unknown fields are errors.

Most relevant document first. Don't summarize the documents; agents read the ones they need.
