Run via claude-sonnet-5-5 at high effort.

```yaml
documents:
  - path: vault/repositories/galaxy/branches/active/invocation_graph_embedded_outputs/spike_debrief.md
    why: The stage 2 evidence base. Nudge go/no-go numbers per card size and direction, the bugs found only in a live browser (steps jumping neighbours, grown step covering the next row, empty cards mid-run), and the open questions this stage must settle (drop down mode, interactive vs static, card sizing).
  - path: vault/repositories/galaxy/branches/active/invocation_graph_embedded_outputs/rebase_on_stage1_debrief.md
    why: Exactly which spike commits make up stage 2 (`invocation_graph_output_previews..fb8d4487040`), how the cards were adapted to stage 1 (`:step` prop, `cards` computed, unlabeled outputs left unembedded) and what the stage boundary leaves for stage 3 (`SHRUNK_STEP_SIZE`, base-size-aware layout).
  - path: vault/repositories/galaxy/issues_incubator/incubating/invocation_graph_embedded_outputs/raw.md
    why: Stage 2 requirements. Hard rule of no full re-layout, the go/no-go condition, and the questions on lazy loading, static thumbnails vs interactive widgets and very large outputs.
  - path: vault/research/Component - Invocation Graph View.md
    why: Map of InvocationGraph.vue, useInvocationGraph, scoped invocation-<id> stores, Node.vue invocation mode, fit-on-mount (`fitWorkflow(0.25, 1.0, 20.0)`), minimap and the editor-derived vs generic ELK graph renderers. Its E2E section is stale (see research_requests).
  - path: vault/repositories/galaxy/branches/active/invocation_graph_output_previews/scope_evaluation.md
    why: Stage 1 scope decisions that stage 2 inherits or must settle: bounding very large collections is explicitly a stage 2 requirement, plus the interactive-vs-embedded-mode question for CollectionDisplay controls.
    load_when: Deciding card content, large-collection handling, or interactivity.
  - path: vault/repositories/galaxy/branches/active/invocation_graph_output_previews/performance_challenges_debrief.md
    why: Measured cost of CollectionDisplay (about 1.24 KB and 1.8 ms per element, no cache, refetch on every mount) and the previewsMounted fix. Stage 2 mounts one preview per card at page load, so these numbers multiply.
    load_when: Choosing lazy-loading/in-view mounting for embedded cards or sizing cards by datatype.
  - path: vault/repositories/galaxy/branches/active/invocation_graph_output_previews/thermo_nuclear_review.md
    why: Records the `step` contract of InvocationOutputPreview (required; stage 2 must handle a missing `steps[sourceId]` at the lookup) and why `GraphStep.outputItems` stays, since stage 2 reads it to embed without per-step fetches.
    load_when: Reviewing InvocationEmbeddedOutputs or changing outputItems.
  - path: vault/repositories/galaxy/branches/active/invocation_graph_output_previews/test_challenges_debrief.md
    why: Test conventions and decisions from stage 1 (shallowMount with real CollectionDisplay, data-description hooks instead of styling classes, Selenium vs unit split) to follow for the embedded-card tests.
    load_when: Writing unit or Selenium tests for the embed toggle and cards.
  - path: vault/research/Component - Dataset Display.md
    why: Catalog of rendering paths; F6 covers Markdown HistoryDatasetDisplay's own dispatcher (tabular, image, pdf/html iframe, else pre) that cards reuse, including the unsandboxed html/pdf iframe.
    load_when: Deciding what a card shows per datatype, or html/pdf and large outputs.
  - path: vault/research/Component - Markdown Visualizations.md
    why: Background on the Markdown directives whose HistoryDatasetDisplay and CollectionDisplay components are embedded in the cards.
    load_when: Touching the `embedded` prop or collection display behavior.
  - path: vault/research/Component - Workflow Invocation Models.md
    why: Which invocation payload fields carry workflow inputs/outputs (output_datasets, output_collections keyed by workflow_step_id) versus per-step outputs; why workflow output datasets exist from scheduling so the layout is stable mid-run.
    load_when: Matching embedded outputs to steps or reasoning about running invocations.
  - path: vault/research/Component - E2E Tests - Writing.md
    why: Selenium/Playwright layering, navigation.yml components, screenshot and Playwright-compat conventions for an E2E test of the Embed Outputs toggle.
    load_when: Writing the E2E test and screenshots.
  - path: vault/research/Component - E2E Tests Smart Components.md
    why: How to add navigation.yml selectors and parameterized components for the toggle and embedded cards.
    load_when: Adding embedded-card selectors to navigation.yml.
  - path: vault/projects/invocation_graph_embedded_outputs/index.md
    why: Project hub with the spike's embed-right/embed-down screenshots to compare layout results against.
    load_when: Reviewing the layout visually or writing the PR description.
  - path: vault/research/PR 21932 - History Graph API.md
    why: The other graph renderer, which uses ELK layered layout via useHistoryGraphLayout and shares zoom utilities and connectionPath; useful contrast for why the editor-derived canvas is nudged rather than re-laid out.
    load_when: Wondering whether the generic GraphView/ELK path is an alternative (it is not for this stage).
  - path: vault/research/PR 17413 - Invocation Graph View.md
    why: Origin of the invocation graph and the scoped-store design.
    load_when: Questions on why isInvocation mode and scoped stores exist.
  - path: vault/research/PR 20390 - Workflow Graph Search.md
    why: Search highlighting and scroll-to-node on the same canvas; embedded cards must not break node lookup or focus behavior.
    load_when: Checking interactions with graph search and focus mode.
research_requests:
  - vault/agents/gx_research/todo/workflow_graph_canvas_and_layout.md
  - vault/agents/gx_research/todo/invocation_graph_view_refresh.md
```
