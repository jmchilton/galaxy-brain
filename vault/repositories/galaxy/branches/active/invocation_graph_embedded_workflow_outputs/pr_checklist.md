Run via claude-opus-5-5 at medium effort.

- [x] What does the user see when it fails? Each card shows its own state: stage 1's not-ready placeholder, the dataset display's own error, or "Failed to load the collection: <error>". With nothing to embed, the toggle is disabled with the tooltip "No workflow outputs to show yet".
  <details>

  - `InvocationOutputPreview.vue` (`123f3d2b861`) keeps stage 1's not-ready rule for cards. The placeholder gains an `invocation-output-not-ready` class so `InvocationEmbeddedOutputs.vue` can inset it.
  - Dataset cards fall through to `HistoryDatasetDisplay`, which shows the errored dataset or the fetch error, as Markdown embeds do.
  - `InvocationEmbeddedCollection.vue` shows `LoadingSpan` while it loads and a `text-danger` message if either fetch fails. Responses for a stale `collectionId` are ignored.
  - `InvocationGraph.vue` (`ed663d7b6266`) disables the toggle while `!hasEmbeddableOutputs` and shows `disabled-title`.
  - Gaps: cards are `inert`, so an error inside one can't be acted on there. The step details and the stage 1 hover stay the interactive route. No unit test covers the collection summary's error branch.
  </details>
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. Most tests assert on geometry and rendered output. A few check props or call counts where those are the behaviour.
  <details>

  - `embeddedOutputLayout.test.ts` (`404b25b0db7`, 18 tests) asserts the resulting rectangles: cards beside their source, rows kept, steps never moved left or vertically, author overlaps preserved. Two of them run on real layouts (the test workflow and IWC CUT&RUN).
  - `useEmbeddedOutputs.test.ts` checks step-store positions after toggling, restoration on disable, and re-layout after a size change. It uses a spy on the real `layoutEmbeddedOutputs` only to count layouts per frame, which is the performance behaviour being pinned.
  - `InvocationEmbeddedCollection.test.ts` asserts the rendered name, first two elements, "and N more" for a 500-element list, and that only `limit=2` element requests are made.
  - `InvocationEmbeddedOutputs.test.ts` mostly checks props passed to `InvocationOutputPreview` (`summarizeCollection: true`). This is the closest to literal, but it's small.
  - Selenium `test_embed_workflow_outputs` (`3b546b24e6f`) checks real content (5 and 8 table rows, image, collection summary), cards clear of every step, connectors, pointer pass-through, no focusable controls, and restoration on toggle-off.
  </details>
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. `a5b16ff29b9` is test-only and leads: it moves stage 1's opening of the invocation into `_open_output_kinds_invocation`/`_drop_focus` with no behaviour change. Each feature commit carries its own tests.
- [x] Are the comments free of excess archeology? Yes. The added comments explain current constraints, for example why cards are inert, why the layout runs once per frame, why one sorted pass settles every rule, and why positions are copied. None narrate history.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? None. The feature is client-only and opt-in: the "Embed Outputs" toggle starts off. The shared editor change in `52f955f719e` (`fitWorkflow`'s `extraRectangles` and the `node-area` slot in `WorkflowGraph.vue`) defaults to nothing, so the editor is unchanged. The stage 1 hover popover still uses the full `CollectionDisplay`, and there are no backend or API changes.
- [x] Who hits this in practice and what is the evidence? Users who read a run's results off the invocation graph and want the labeled outputs in view beside the steps that made them, without hovering each one. Evidence: John's maintainer requirements draft (`issues_incubator/incubating/invocation_graph_embedded_outputs/raw.md`, from user input) and the spike screenshots, which John accepted with no separate issue (John, 2026-11-03).
- [x] Were simpler or existing approaches considered? Yes. The cards reuse stage 1's `InvocationOutputPreview`. Placement is a right-only nudge, not a re-layout, per John's go/no-go rule. Each simpler or richer alternative was measured and its rejection recorded (`initial_implementation_debrief.md`, `scope_evaluation.md`).
  <details>

  - Full re-layout: ruled out by John (2026-10-20). Nudging keeps rows and columns, and no card detaches on the test workflow or four IWC layouts.
  - Down or automatic direction: dropped. Right mode moves less on four of five workflows, and an automatic choice could flip mid-run.
  - Interactive cards: rejected because they blocked panning over about a third of the graph. Cards are static, and the interactive preview stays one hover away.
  - Size by datatype: rejected because it needs a request per card before layout, or a re-layout that makes the graph jump. Sizes are constant.
  - Stage 1's `CollectionDisplay` for collection cards: replaced by a summary. Four 500-element lists went from 2.49 MB/5.85 s to 7.4 KB/0.41 s.
  - The spike's fixed-point push loop: replaced by a one-pass constraint layout after it ran away in review.
  - Lazy loading, unlabeled outputs, minimap cards and inputs marked as outputs were considered and left as PR-noted gaps (`scope_evaluation.md`).
  </details>
