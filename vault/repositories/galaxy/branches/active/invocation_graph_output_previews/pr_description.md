Implement output previews in the workflow invocation graph: hover a step's outputs to see its tables, images, text and collections.

The invocation graph shows a run's shape and each step's state, but not what any step produced. To check a step's table or image, you leave the graph for the history or the Outputs tab and find the matching dataset there. With this PR, hovering a step's output terminals opens a popover that previews every output the step produced, using Galaxy's existing Markdown dataset and collection displays:

| Table                                                                                                      | Image                                                                                                      |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| ![Hovering head_table's output shows the top_rows table](screenshots/02_hover_table.png)                   | ![Hovering copy_image's output shows the plot image](screenshots/03_hover_image.png)                       |
| **Collection**                                                                                             | **A step with two outputs**                                                                                |
| ![Hovering split_text's output shows the lines list and its elements](screenshots/04_hover_collection.png) | ![Hovering the numbers step lists both outputs with their text](screenshots/05_hover_multiple_outputs.png) |

***This is a maintainer-proposed feature and the first stage of a larger effort to show outputs inside the invocation graph. It only adds the hover popover: nodes, layout and the graph itself are unchanged, and later stages (outputs embedded as nodes) will come as separate PRs. It's a quick look from the graph; the Outputs tab, step cards and history are unchanged.***

***It is client-only. There are no API, backend or database changes. The popover reads the invocation payload, and the existing step-details endpoint only for outputs the payload doesn't list. The workflow editor is unaffected: the popover is mounted only in invocation mode.***

<details><summary>How it behaves</summary>

- One popover per step, hanging from the topmost of its output terminals (in invocation mode a step's terminals are stacked on one spot). Outputs are labelled by their workflow output label, or by output name if they aren't workflow outputs.
- Datasets go through the Markdown `HistoryDatasetDisplay` (tables, images, text) and collections through `CollectionDisplay`. No new renderers.
- While a step's jobs haven't finished, its outputs show "This output isn't ready yet: the step is running." and load nothing. When the step's state changes, previews reload, so a dataset first seen mid-run doesn't stay stale.
- Previews mount on the first hover and stay mounted between hovers, so hovering again makes no requests until the step's state changes. A hidden popover never fetches.
- Parameter inputs aren't previewed (their value is already on the node), and neither are steps that haven't been scheduled yet.

</details>

<details><summary>How the branch is organised</summary>

Four commits, about 300 production lines and 550 lines of tests and selectors:

1. A test-only Selenium helper refactor (`_open_invocation(workflow, labels)`).
2. `GraphStep.outputItems` and `invocationStepId` in `useInvocationGraph`, read from the invocation payload, with Vitest.
3. `InvocationStepOutputsPopover.vue`, `InvocationOutputPreview.vue` and `useStepOutputItems.ts` under `Workflow/Invocation/Graph/`, mounted by one tag and a small terminal-lookup helper in `Node.vue` (invocation mode only), with Vitest.
4. A Selenium/Playwright test hovering a table, an image, a collection and a two-output step, plus `navigation.yml` selectors and a `data-description` hook on `CollectionTree.vue`.

</details>

## Risks

Risks are minimal - this is an additive hover UI with no API or data changes, so it doesn't lock Galaxy into difficult-to-change choices (a two-way door).

<details><summary>Risk Details</summary>

- A mapped-over step whose jobs are all new or queued (or a mix of pending and finished jobs) already reads as `ok` on `dev`. On such a step the "isn't ready yet" placeholder doesn't appear, and an open popover can load a collection that is still filling. This PR doesn't change how step state is derived.
- The popover is tooltip-role, not interactive, so table pagination and the collection's buttons and tree toggles inside it can't be reached by keyboard. The step card remains the keyboard route to the same outputs.
- A large collection's first hover downloads and renders every element, as the Markdown collection display does elsewhere. Later hovers reuse it.
- Subworkflow steps keep the state `scheduled`, so their previews never show the not-ready placeholder and don't reload when the subworkflow finishes.

</details>

<details><summary>Risk Review Advice</summary>

The freshness rules are the subtle part: the `loadedUnderState` map in `InvocationOutputPreview.vue` and the single watcher in `InvocationStepOutputsPopover.vue`, which decides when previews mount, unmount and reload. Check that they match what you expect for a running invocation.

The `Node.vue` change is one tag and a terminal-lookup helper inside the shared editor node, mounted only in invocation mode; confirm the editor is untouched.

</details>

## Context

First stage of 🌿[invocation_graph_embedded_outputs](https://github.com/jmchilton/galaxy/tree/invocation_graph_embedded_outputs), used to load and render a step's outputs for the later stages, which embed workflow outputs in the graph as larger nodes. Builds on the invocation graph view from 🔀 #17413. Developed with [John's Galaxy Brain Branch Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-branches/).

## Human Review

(PUBLISHING_AGENT: Please include the contents of BRANCH_DIRECTORY/human_review.md before publishing this. If that file doesn't exist please double check that this PR should be published - if user confirms yes publish without this section.)

## Agentic Checks

### ✅ [John's Agentic Checklist](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/gx_pr_checklists/GENERAL.md)

<details><summary>All general and workflow-related items pass.</summary>

- [x] What does the user see when it fails? A placeholder that names the step's state ("This output isn't ready yet: the step is running."), "No outputs produced yet.", or the existing Markdown dataset/collection displays' own error states.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They assert observable behaviour (rendered text, previewed labels and items, HTTP request counts against a mocked server), not internals.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. `655900d77d0` (Selenium `_open_invocation` helper, test-only, no behaviour change) leads. Each feature commit carries its own new tests.
- [x] Are the comments free of excess archeology? Yes. The added comments explain current constraints (stacked terminals, the payload leaving `steps[].outputs` empty, the stores caching by id). None narrate history.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? None. The change is client-only: a hover popover on the invocation graph's output terminals and two new optional `GraphStep` fields. The editor's `Node.vue` mounts the popover only when `isInvocation` is set, and there are no backend or API changes.
- [x] Who hits this in practice and what is the evidence? Users who read a run's results off the invocation graph and today leave it for the history or the Outputs tab to see a step's table, image or collection. Evidence: John's maintainer requirements draft (`issues_incubator/incubating/invocation_graph_embedded_outputs/raw.md`, from user input) and the spike screenshots, which John accepted as the motivation with no separate issue (John, 2026-11-03).
- [x] Were simpler or existing approaches considered? Yes. The previews reuse the existing Markdown `HistoryDatasetDisplay`/`CollectionDisplay` instead of new renderers, and read the invocation payload before falling back to the existing step-details endpoint (no API change).

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/invocation_graph_output_previews/pr_checklist/). Run via claude-opus-5-5 at medium effort.

</details>

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Covers the whole stage 1 brief; one recommended expansion (mapped-over step state) was left out.</summary>

The evaluation recommended also fixing how mapped-over step state is derived (about 10 lines in `useInvocationGraph.ts`), since the not-ready placeholder trusts that state. That fix was left out of this PR; it's a pre-existing bug that also affects the node header, step card and Steps tab. Bounding large collection previews, a lighter step-details payload, keyboard access, whole-node hover and subworkflow state were all weighed and kept out of scope.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/invocation_graph_output_previews/scope_evaluation/). Run via claude-opus-5-5 at high effort.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No structural regressions or blockers; three contract and state-model findings fixed.</summary>

No file crosses 1,000 lines, and shared code gains only one invocation-mode tag in `Node.vue` and one `data-description` in `CollectionTree.vue`. Fixed: the preview and composable now require a `step` (the optionality was never used), the popover's three watchers became one, and an unwatched `ref` became a plain variable.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/invocation_graph_output_previews/thermo_nuclear_review/). Run via claude-opus-5-5 at high effort.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Unit tests moved onto <code>shallowMount</code> with fewer hand stubs; 14 mutations each fail their own test.</summary>

A hand-written dataset display stub that re-implemented the child's store reads was removed, so request counts now measure only the preview's own reloads. One popover test that Selenium already covers end to end was dropped, and the Selenium test now asserts output labels. Mutations of every branch of the matching, freshness, not-ready and mount logic each fail the test that covers them.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/invocation_graph_output_previews/test_challenges_debrief/). Run via claude-opus-5-5 at high effort.

</details>

### ✅ [N.O.T. M.A.R.I.U.S. Performance Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_PERFORMANCE.md)

<details><summary>Measured; re-hovering a 500-element list went from 621 KB and about 2.5 s to no requests and about 0.5 s.</summary>

- Previews now stay mounted between hovers, so a collection isn't refetched on every hover.
- Dataset previews no longer reload at each state a running step passes through.
- Output item matching reads raw objects (`toRaw`), removing about 55 ms of per-poll cost at 2,000 steps.
- Left for later: large collections' first load is unbounded, and the step-details payload carries every job.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/invocation_graph_output_previews/performance_challenges_debrief/). Run via claude-opus-5-5 at high effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>Two defects confirmed and fixed, each with a test that fails without the fix.</summary>

- An open popover didn't reload when the step's state changed while it was shown. It now does.
- Finished subworkflow outputs were stuck behind "not ready", because a subworkflow step's state stays `scheduled`. Subworkflow steps now skip the not-ready check.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/invocation_graph_output_previews/codex_review/). Run via gpt-6.1-sol (codex-cli 0.165.0).

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>One test-only Selenium helper refactor now leads the feature commits.</summary>

`_open_two_branches_invocation` became `_open_invocation(workflow, labels)` in its own first commit; the six existing invocation graph tests behave the same. Everything else in the diff is new behaviour and stays in the feature commits.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/invocation_graph_output_previews/baseline_refactor/). Run via claude-opus-5-5 at high effort.

</details>

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
