Run via claude-sonnet at high effort.

```yaml
documents:
  - path: vault/repositories/galaxy/branches/active/invocation_graph_embedded_outputs/spike_debrief.md
    why: Evidence for the stage 3 design. Preferred output stored in the unused `WorkflowStep.config` with no migration, the live-verified editor/`.ga` round trip, v1 invocations showing nothing because the metadata sits on v2, gxformat2 dropping the field, and the open questions (latest vs invoked version, `config` vs dedicated column).
  - path: vault/repositories/galaxy/branches/active/invocation_graph_embedded_outputs/rebase_on_stage2_debrief.md
    why: Commit-by-commit account of stage 3 on stage 2 (backend `af4c0230500`, editor, graph), behavioural differences from the spike, and the stated gaps (format 2 drops it, no validation of a stale `preferred_output`).
  - path: vault/repositories/galaxy/issues_incubator/incubating/invocation_graph_embedded_outputs/raw.md
    why: Stage 3 requirements, the dedup rule against workflow outputs, and the open questions on version resolution, `config` vs column, gxformat2 and growth across rows (mixed-axis placement).
  - path: vault/research/Component - Workflow Invocation Models.md
    why: Every version has its own `WorkflowStep` rows and `WorkflowInvocation.workflow_id` points at one version, which decides whether display metadata resolves against the invoked or the latest version; also where invocation output rows come from.
    load_when: Reasoning about versioning, or matching a step's preferred output to invocation outputs.
  - path: vault/research/PR 17413 - Invocation Graph View.md
    why: The invocation graph loads the workflow version that was run (`getFullWorkflowCached(workflowId, version)`), so preferred outputs set on a later version do not show on older invocations.
    load_when: The invoked-vs-latest question.
  - path: vault/research/Component - Invocation Graph View.md
    why: Map of `InvocationGraph.vue`, `useInvocationGraph`, scoped stores, and `Node.vue`/`NodeOutput.vue` invocation mode that the step-as-output rendering extends; its E2E section is stale (see research_requests).
  - path: vault/research/Component - Workflow Refactoring API.md
    why: The refactor executor exports to a `.ga` dict, mutates it and re-imports, so `preferred_output` only survives if export and import both carry it; also states `order_index` is the version-stable step identity.
    load_when: Reviewing round-trip behavior or what happens to a stale `preferred_output` after `upgrade_tool` or output removal.
  - path: vault/research/Component - Workflow Import.md
    why: Import path through `__module_from_dict` and the first/second construction passes that now read `preferred_output`; documents which step-dict keys are applied and the session/commit ordering.
    load_when: Reviewing the import side of the backend change.
  - path: vault/research/Component - Workflow Format (.ga).md
    why: Persisted `.ga` step fields (`when`, `workflow_outputs`, `position`, ...) that the new optional `preferred_output` key sits beside; the format never bumps `format-version`, so new optional keys are the norm.
  - path: vault/research/Component - Workflow Format Differences.md
    why: Native vs Format2 fidelity: what Format2 preserves, its lossy native-to-Format2 round trip, and why a field outside the gxformat2 schema is dropped on conversion.
    load_when: Judging the "format 2 drops it" gap or the out-of-scope gxformat2 follow-up.
  - path: vault/research/Dependency - gxformat2.md
    why: gxformat2's conversion pipeline (`python_to_workflow`, native export), the repo where `preferred_output` support would have to land.
    load_when: Scoping or filing the gxformat2 follow-up.
  - path: vault/projects/wf_refactor_persistence/index.md
    why: Describes `UpdateStepAction` (the generic step update used by the star toggle) and how its serializer maps changed keys to backend refactor actions, so a new step key needs either a mapping or an explicit no-op when persisted undo lands.
    load_when: Reviewing the editor toggle or interplay with the persisted refactor/undo work.
  - path: vault/research/Component - Workflow Editor Terminals.md
    why: Covers `NodeOutput.vue` as a terminal and the editor node components the star button was added to; useful to avoid breaking terminal behavior.
    load_when: Reviewing the `NodeOutput.vue` change.
  - path: vault/repositories/galaxy/branches/active/invocation_graph_embedded_workflow_outputs/implementation_debrief.md
    why: Stage 2 decisions stage 3 must stay consistent with (nudge only, push right, static inert cards, constant card sizes, one-pass layout) and how the `LayoutNode` base sizes are consumed.
    load_when: Reviewing the layout growth accounting.
  - path: vault/repositories/galaxy/branches/active/invocation_graph_embedded_workflow_outputs/pr_description.md
    why: Stage 2's published contract (embed toggle, dedup, sizes) that stage 3's description and tests must match.
    load_when: Writing the stage 3 PR description.
  - path: vault/repositories/galaxy/branches/active/invocation_graph_embedded_workflow_outputs/brain_research.md
    why: Stage 2's document list (graph canvas, dataset display, performance, E2E conventions) that largely applies to the graph half of stage 3.
  - path: vault/repositories/galaxy/branches/merged/invocation_graph_e2e/implementation_debrief.md
    why: How the invocation graph Selenium tests, helpers and screenshots were built; stage 3's E2E test extends that file.
    load_when: Working on `test_embed_shows_steps_as_their_preferred_output`.
  - path: vault/research/Component - Workflow API.md
    why: Workflow versioning semantics (each save of steps creates a new version, metadata-only updates do not) and the PUT update path through `update_workflow_from_raw_description`.
    load_when: Questions about when a `preferred_output` change creates a new version.
  - path: vault/projects/invocation_graph_embedded_outputs/index.md
    why: Project hub with spike screenshots, including the editor star control (`11_editor_preferred_output_star.png`) and preferred-output layouts to compare against.
    load_when: Visual review or the PR description.
research_requests:
  - vault/agents/gx_research/todo/workflow_serialization_editor_dict_export.md
  - vault/agents/gx_research/todo/workflow_editor_step_store_and_undo.md
```
