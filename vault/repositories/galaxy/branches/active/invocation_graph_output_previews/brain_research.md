```yaml
documents:
  - path: vault/repositories/galaxy/branches/active/invocation_graph_embedded_outputs/spike_debrief.md
    why: The spike's bugs found only in a live browser (empty steps[].outputs, store caching by id) and the answers behind stage 1's data flow, reuse and hover target.
  - path: vault/research/Component - Invocation Graph View.md
    why: Map of InvocationGraph.vue, useInvocationGraph, scoped invocation-<id> stores, Node.vue invocation mode and polling; its E2E section is stale (see research_requests).
  - path: vault/projects/invocation_graph_embedded_outputs/index.md
    why: Project hub for the three stages, with the stage 1 hover screenshots to compare against.
    load_when: Reviewing the result visually or writing the PR description.
  - path: vault/repositories/galaxy/issues_incubator/incubating/invocation_graph_embedded_outputs/raw.md
    why: Stage 1 requirements (datatype-dependent preview, reuse existing components) and the open question on prior-art issues and PRs.
    load_when: Scoping the stage and writing the PR description.
  - path: vault/research/Component - Dataset Display.md
    why: Catalog of rendering paths; F6 covers Markdown HistoryDatasetDisplay's own dispatcher (tabular, image, pdf/html iframe, else pre) that the previews reuse.
    load_when: Choosing what a preview shows per datatype, or handling html/pdf and large outputs.
  - path: vault/research/Component - Markdown Visualizations.md
    why: Background on the Markdown directives whose HistoryDatasetDisplay and CollectionDisplay elements are embedded in the popover.
    load_when: Touching the embedded `embedded` prop or collection display behavior.
  - path: vault/research/Component - Workflow Invocation Models.md
    why: What the invocation payload carries (output_datasets, output_collections, input datasets keyed by workflow_step_id) versus per-step outputs.
    load_when: Matching invocation.inputs/outputs/output_collections to steps.
  - path: vault/research/Component - E2E Tests - Writing.md
    why: Selenium/Playwright test layering, navigation.yml components, screenshot and Playwright-compat conventions for an E2E hover test.
    load_when: Writing the E2E test and screenshots.
  - path: vault/research/Component - E2E Tests Smart Components.md
    why: How to add navigation.yml selectors and use parameterized components.
    load_when: Adding hover popover selectors to navigation.yml.
  - path: vault/research/Component - Galaxy UI Buttons and Tooltips.md
    why: Shared hover delay timing (tooltipTiming.ts) and how E2E helpers observe hover tooltips; explicitly excludes GPopover.
    load_when: Tuning hover delays or waiting on hover UI in tests.
  - path: vault/research/PR 17413 - Invocation Graph View.md
    why: Origin of the invocation graph and the scoped-store design; history of useInvocationGraph.
    load_when: Questions on why isInvocation mode and scoped stores exist.
  - path: vault/projects/compare_runs/plan.md
    why: Plans to generalize DatasetPopoverLink (GPopover plus datasetStore) for dataset and collection popovers, a nearby consumer of the same stores.
    load_when: Reusing or avoiding overlap with DatasetPopoverLink.
research_requests:
  - vault/agents/gx_research/todo/gpopover_and_hover_popovers.md
  - vault/agents/gx_research/todo/invocation_graph_view_refresh.md
```
