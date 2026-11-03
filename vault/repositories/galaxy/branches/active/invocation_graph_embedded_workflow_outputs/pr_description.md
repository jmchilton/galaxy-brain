Implement embedded workflow outputs in the invocation graph: an "Embed Outputs" toggle shows each labeled output as a card beside its step.

Stage 1 lets you hover a step to preview what it produced, one step at a time. To read a run's results as a whole, its tables, plots and collections next to the steps that made them, you still hover every step or leave the graph for the Outputs tab. With this PR, one toggle puts every labeled workflow output on the graph as a static card pinned beside its step. Steps shrink, and only the steps in a card's way, and the steps downstream of them, move right, so the layout the author drew stays recognizable. Toggling off restores it exactly.

| Before | After |
|---|---|
| ![The Output previews invocation at its authored layout, Embed Outputs off](screenshots/01_output_previews_before_embedding.png) | ![The same invocation with Embed Outputs on: six cards beside their steps, later steps pushed right](screenshots/02_output_previews_embedded.png) |
| ![The middle of an IWC ChIP-seq PE layout replica at 50%, before embedding](screenshots/06_chipseq_before_embedding_50pct.png) | ![The same view embedded: Bowtie2's card appears and the steps after it move 49 pixels right](screenshots/07_chipseq_embedded_50pct.png) |
| ![The upper left of an IWC ATAC-seq layout replica at 50%, before embedding](screenshots/09_atacseq_before_embedding_50pct.png) | ![The same view embedded: cards beside Bowtie2 and the duplicate removal step, downstream steps shifted right, the left column fixed](screenshots/10_atacseq_embedded_50pct.png) |

The ChIP-seq and ATAC-seq rows are layout replicas: the real IWC positions, labels, edges and workflow outputs, with test tools in place of the real ones, so card contents are placeholder text and small test tables.

***This is a maintainer-proposed feature and the second stage of the invocation graph outputs effort. It stacks on the stage 1 hover previews (🌿[invocation_graph_output_previews](https://github.com/jmchilton/galaxy/tree/invocation_graph_output_previews)), and this description covers only what stage 2 adds. Stage 3, a step's preferred output drawn inside its node, builds on this and comes separately.***

***The toggle starts off, and it is a nudge, never a re-layout: steps keep their rows and only ever move right, by as little as the cards need. Toggling off puts every step back where the author placed it, and nothing is saved: the workflow's stored positions never change. Only labeled workflow outputs get cards, as static snapshots that drags and zooms pass through, and nothing loads until the toggle is on. The Outputs tab and stage 1's hover previews are unchanged.***

***It is client-only. There are no API, backend or database changes, and the workflow editor is unaffected: shared editor code gains only an optional `fitWorkflow` argument and an empty slot.***

<details><summary>Up close, on the ChIP-seq layout, and while a run is still going</summary>

| | |
|---|---|
| ![The embedded Output previews graph at 100%: a table card, the plot card and the lines collection summary beside their steps](screenshots/03_output_previews_embedded_closeup.png) | ![Three cards stacked beside Call Peaks with MACS2 at 80%](screenshots/08_chipseq_embedded_macs2_stack_80pct.png) |
| ![Embedded while the final step runs: its card shows the not-ready placeholder](screenshots/13_running_embedded_closeup_90pct.png) | ![The same page after the step finished: the card filled in place, nothing moved](screenshots/14_running_finished_closeup_90pct.png) |

</details>

<details><summary>How it behaves</summary>

- **Which outputs:** each labeled workflow output that has a dataset or collection yet (they exist once their step is scheduled). The toggle is disabled ("No workflow outputs to show yet") until one has.
- **Cards:** 260×170 for datasets, 260×120 for collections, pinned right of their step with a dashed connector; several outputs of one step stack downwards. Datasets render through stage 1's preview (tables, images, text). Collections show a summary: the name, the history panel's description, and the first two elements plus "and N more".
- **Static:** cards are inert and pointer-transparent, so dragging and zooming over them move the graph, and nothing in them takes focus. Content is clipped, and a table's pagination is hidden. The interactive preview stays one hover away (stage 1) and in the step details.
- **Layout:** steps shrink to 9rem, then one left-to-right pass pushes each step just far enough to clear the cards and keep its row order and flowing edges. Steps never move up, down or left, and the graph refits to include the cards.
- **Running invocations:** a card shows the not-ready placeholder until its step finishes, then fills in place. Polling causes no re-layout, except once when a step scheduled later (after a subworkflow, say) first gets its outputs.

</details>

<details><summary>What it doesn't do (known gaps)</summary>

- Cards aren't drawn in the minimap; it shows the nudged steps without them.
- Unlabeled workflow outputs aren't embedded.
- A workflow input that is also marked as an output gets no card: the editor-style workflow the graph loads leaves out input steps' `workflow_outputs`.
- Large workflows already fit at the graph's 25% minimum zoom, so on ATAC-seq-sized graphs the cards are thumbnails until you zoom in.
- About 50 or more dataset cards would queue behind the client's request rate limiter on toggle (delayed, not failed).
- When the author overlapped steps, an edge can end up running backwards. Nothing overlaps as a result.

</details>

<details><summary>How the branch is organised</summary>

Six commits, about 620 production lines and 880 lines of tests and selectors:

1. A test-only Selenium helper refactor of stage 1's test (`_open_output_kinds_invocation`).
2. `WorkflowGraph.vue`: `fitWorkflow` takes optional extra rectangles, and a `node-area` slot draws content in workflow coordinates.
3. `embeddedOutputLayout.ts`, the pure layout function, with Vitest.
4. `InvocationEmbeddedCollection.vue` and `InvocationOutputPreview`'s `summarizeCollection` option, with Vitest.
5. The feature: `useEmbeddedOutputs`, `InvocationEmbeddedOutputs.vue` and the toggle in `InvocationGraph.vue`, with Vitest.
6. A Selenium/Playwright test of the toggle, cards, connectors, static cards and restore, plus `navigation.yml` selectors.

</details>

## Risks

Risks are minimal - this is an opt-in, client-only view on the invocation graph with no API or data changes, so it doesn't lock Galaxy into difficult-to-change choices (a two-way door).

<details><summary>Risk Details</summary>

- On dense workflows the original edges keep their routes and pass under the opaque cards (for example several ATAC-seq edges).
- The layout was measured on the test workflow and four IWC layouts (ChIP-seq PE, CUT&RUN, dada2, ATAC-seq). The worst case, ATAC-seq, moves 21 of 42 steps by up to 527px live (17 steps and 354px offline), and offline 19 of its 1722 pairwise left/right and above/below orderings flip. Workflows unlike these may nudge more.
- Card sizes are constant, so a tall table or a large image is clipped to the card. The hover preview shows it whole.
- Cards inherit stage 1's step state: a mapped-over step whose jobs are all still pending already reads as `ok` on `dev`, so its card may load before the jobs finish.

</details>

<details><summary>Risk Review Advice</summary>

The layout rules are the subtle part: `minimumOffset` and the settle order in `embeddedOutputLayout.ts`. Each rule is a lower bound on a step's x relative to a step settled before it, which is why one sorted pass satisfies them all and can't run away. Check that the rules match what you'd expect a "nudge right" to do.

The shared-code change is 7 lines in `WorkflowGraph.vue` (an optional `extraRectangles` argument to `fitWorkflow` and an empty `node-area` slot); confirm the editor is untouched.

</details>

## Context

Second stage of 🌿[invocation_graph_embedded_outputs](https://github.com/jmchilton/galaxy/tree/invocation_graph_embedded_outputs), used to embed workflow outputs in the graph; the third stage (a step's preferred output shown in the node) builds on it. Stacks on the stage 1 hover previews, 🌿[invocation_graph_output_previews](https://github.com/jmchilton/galaxy/tree/invocation_graph_output_previews), whose `InvocationOutputPreview` the cards reuse. Builds on the invocation graph view from 🔀 #17413. Developed with [John's Galaxy Brain Branch Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-branches/).

## Human Review

(PUBLISHING_AGENT: Please include the contents of BRANCH_DIRECTORY/human_review.md before publishing this. If that file doesn't exist please double check that this PR should be published - if user confirms yes publish without this section.)

## Agentic Checks

### ✅ [John's Agentic Checklist](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/gx_pr_checklists/GENERAL.md)

<details><summary>All general and workflow-related items pass.</summary>

- [x] What does the user see when it fails? Each card shows its own state: stage 1's not-ready placeholder, the dataset display's own error, or "Failed to load the collection: <error>". With nothing to embed, the toggle is disabled with the tooltip "No workflow outputs to show yet".
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. Most tests assert on resulting geometry and rendered output, two of the layout tests on real layouts (the test workflow and IWC CUT&RUN); a few check props or call counts where those are the behaviour.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. `a5b16ff29b9` is test-only and leads. Each feature commit carries its own tests.
- [x] Are the comments free of excess archeology? Yes. The added comments explain current constraints (why cards are inert, why the layout runs once per frame, why one sorted pass settles every rule). None narrate history.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? None. The feature is client-only and opt-in, the shared `WorkflowGraph.vue` hooks default to nothing, and the stage 1 hover is unchanged.
- [x] Who hits this in practice and what is the evidence? Users who read a run's results off the invocation graph and want its labeled outputs in view beside the steps that made them. Evidence: John's maintainer requirements draft (`issues_incubator/incubating/invocation_graph_embedded_outputs/raw.md`, from user input) and the spike screenshots, which John accepted as the motivation with no separate issue (John, 2026-11-03).
- [x] Were simpler or existing approaches considered? Yes. The cards reuse stage 1's preview, and placement is a right-only nudge rather than a re-layout. A down or automatic direction, interactive cards, sizing by datatype, the full collection display in cards, and the spike's fixed-point push loop were each measured and rejected.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/invocation_graph_embedded_workflow_outputs/pr_checklist/). Run via claude-opus-5-5 at medium effort.

</details>

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep scope: nudging keeps every measured layout recognizable, and each gap is one to note, not fix.</summary>

On John's go/no-go rule the evidence says go: no card detaches on the test workflow or four IWC layouts, and the worst case flips 19 of 1722 step pairs. Embedding unlabeled outputs, cards for inputs marked as outputs, minimap cards, lazy-loading cards, help past the 25% minimum zoom and the author-overlap edge case were weighed and left out. Each would widen scope or reopen a decision, and none is needed for correctness at measured sizes.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/invocation_graph_embedded_workflow_outputs/scope_evaluation/). Run via claude-opus-5-5 at high effort.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No structural regressions or blockers; the cards became a plain renderer of the composable's model.</summary>

No file nears 1,000 lines, and shared code gains only a `fitWorkflow` argument and an empty slot. Fixed: the card layer no longer rebuilds data the composable already had, the not-ready rule lives in one place, the layout rules are one pure function, the invocation-only layout module moved under `Invocation/Graph/`, and both refits go through one `fitGraph` helper.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/invocation_graph_embedded_workflow_outputs/thermo_nuclear_review/). Run via claude-opus-5-5 at high effort.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Every layout rule is pinned: surviving layout mutations went from 12 of 30 to 2.</summary>

New tests pin row order, maximum stack width, the sources-first tie-break, card spacing and non-flowing edges. Tests that faked browser layout or asserted pixel styles moved to Selenium, which now checks connectors, pointer pass-through and focus; each new assertion failed against a mutation. The two surviving mutations are tie-breaks where both choices give valid layouts.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/invocation_graph_embedded_workflow_outputs/test_challenges_debrief/). Run via claude-opus-5-5 at high effort.

</details>

### ✅ [N.O.T. M.A.R.I.U.S. Performance Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_PERFORMANCE.md)

<details><summary>Measured; four 500-element collection cards went from 2.49 MB and 5.85 s to 7.4 KB and 0.41 s.</summary>

- Collection cards show a summary and their first two elements instead of loading every element.
- The layout runs at most once per animation frame: turning on Embed Outputs on ATAC-seq went from 43 runs to 2.
- Step sizes are read only while embedding, and polling a running invocation causes no re-layouts.
- Left for later: very output-heavy workflows can queue requests behind the client rate limiter.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/invocation_graph_embedded_workflow_outputs/performance_challenges_debrief/). Run via claude-opus-5-5 at high effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>One defect confirmed and fixed, with a test that fails without the fix.</summary>

A step the author placed overlapping a source in its own row could end up under the source's card. It now settles after the source and moves past its cards, keeping row order.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/invocation_graph_embedded_workflow_outputs/codex_review/). Run via gpt-6.1-sol (codex-cli 0.165.0).

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>One test-only Selenium helper refactor of stage 1's test leads the feature commits.</summary>

`_open_output_kinds_invocation` takes over the opening of stage 1's output kinds invocation in its own first commit, and the new test calls it from the start. The shared `WorkflowGraph.vue` hooks are new extension points rather than restructurings, so they stay in the feature series.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/invocation_graph_embedded_workflow_outputs/baseline_refactor/). Run via claude-opus-5-5 at high effort.

</details>

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
