Run via claude-opus-5-5 at medium effort.

- [x] What does the user see when it fails? A placeholder that names the step's state ("This output isn't ready yet: the step is running."), "No outputs produced yet.", or the existing Markdown dataset/collection displays' own error states.
  <details>

  - `InvocationOutputPreview.vue` shows the not-ready text while the step is in `NON_TERMINAL_STATES` (except subworkflows, whose state stays `queued`). A finished `error` step falls through to `HistoryDatasetDisplay`/`CollectionDisplay`, which show the errored dataset or a fetch error the way Markdown embeds already do.
  - `InvocationStepOutputsPopover.vue` shows `LoadingSpan` while step details load, then "No outputs produced yet." when nothing is listed.
  - Gap: if the step-details fetch (`fetchInvocationStepById`) fails, `useKeyedCache` records the error but `useStepOutputItems` doesn't expose it, so the popover says "No outputs produced yet." instead of reporting a load failure. Workflow inputs and outputs from the invocation payload still render. This is minor, but surfacing `invocationStore`'s load error would make the message accurate.
  - Known and deferred: a mapped-over step whose jobs are only `new`/`queued` reads as `ok` (`invocation_graph_mapped_step_state`). On such steps the not-ready placeholder doesn't appear, and previews load collections that are still filling.
  </details>
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They assert observable behaviour (rendered text, previewed labels and items, HTTP request counts against a mocked server), not internals.
  <details>

  - `InvocationOutputPreview.test.ts` counts real `/api/datasets` and `/api/dataset_collections` requests across state transitions and remounts. It checks that nothing loads while the step runs, one reload happens once the step is ready, and no reload happens on a same-state remount. It doesn't inspect `loadedUnderState`.
  - `InvocationStepOutputsPopover.test.ts` drives the popover through `GPopover`'s `update:show`, the way a hover does, and asserts on rendered labels, items and `/api/invocations/steps` request counts.
  - `useInvocationGraph.test.ts` feeds invocation payloads (labeled, unlabeled `"<output> (Step N)"`, wrong workflow step, output added on a later poll) and checks the resulting `outputItems`.
  - The Selenium test `test_hover_previews_step_outputs` checks real rendered content: 5 table rows from `head -n 5`, the first row of `2.tabular`, a loaded image, collection element names `["1", "2"]`, and both outputs of a multi-output step.
  </details>
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. `655900d77d0` (Selenium `_open_invocation` helper, test-only, no behaviour change) leads. Each feature commit carries its own new tests.
- [x] Are the comments free of excess archeology? Yes. The added comments explain current constraints (stacked terminals, the payload leaving `steps[].outputs` empty, the stores caching by id). None narrate history.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? None. The change is client-only: a hover popover on the invocation graph's output terminals and two new optional `GraphStep` fields. The editor's `Node.vue` mounts the popover only when `isInvocation` is set, and there are no backend or API changes.
- [ ] Who hits this in practice and what is the evidence? Users who read results off the invocation graph, per John's feature request ("motivated by user input"). No issue, user report or prior-art search is cited.
  <details>

  - The source is the incubating draft `issues_incubator/incubating/invocation_graph_embedded_outputs/raw.md`, whose open questions still include "Prior art: search for existing issues and PRs ... (not done yet)" and filing the issue.
  - Fix: file the stage 1 issue (or an umbrella issue) from the incubator draft, run the prior-art search, and link both from the PR description with the concrete user scenario. That scenario is checking a step's table, image or collection without leaving the graph for the history or the outputs list.
  </details>
- [x] Were simpler or existing approaches considered? Yes. The previews reuse the existing Markdown `HistoryDatasetDisplay`/`CollectionDisplay` instead of new renderers, and read the invocation payload before falling back to the existing step-details endpoint (no API change).
  <details>

  - The output data comes from the invocation payload for workflow inputs and outputs, plus one on-demand `fetchInvocationStepById` for the remaining outputs. A new or trimmed backend endpoint was considered and deferred (`scope_evaluation.md`).
  - One popover per step instead of one per output, because invocation-mode output terminals are stacked on one spot.
  - Tooltip-role rather than `interactive` popover: the terminal `div` can't carry `aria-haspopup`/`aria-expanded` (axe). A focusable trigger was considered and left as a UI decision for John.
  - The step card remains the existing, keyboard-reachable route to outputs. The previews add an in-graph shortcut and don't replace it.
  </details>
