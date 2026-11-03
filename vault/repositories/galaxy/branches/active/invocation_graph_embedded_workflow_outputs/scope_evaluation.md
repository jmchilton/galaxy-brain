Run via claude-opus-5-5 at high effort.

**Recommendation: keep scope as implemented.** None of the gaps the debriefs raised leaves the feature broken or misleading, so none of them justifies an expansion. On the go/no-go rule, the evidence says go. Nudging keeps the test workflow and ChIP-seq clearly recognizable, CUT&RUN keeps its single row of tools, and ATAC-seq keeps its left half untouched. No layout detaches a card, and the worst case flips 19 of 1722 step pairs. Each open item is a gap to mention in the PR description, not to fix here:
- Cards aren't drawn in the minimap.
- Only labeled outputs are embedded.
- A workflow input marked as an output gets no card. This turned out to be a deliberate backend choice, below.
- Many dataset cards can hit the request limiter.
- The largest workflows stay at the 25% minimum zoom.
- An edge can run backwards when the author overlapped steps.

The process default leans toward a modest expansion. Two candidates come closest: embedding everything the invocation lists as an output, and loading cards only once they are in view. Neither is needed for correctness at any measured size. Each would also reopen a scope decision (which outputs count, and when cards load) that John can take later on a working feature.

## Possible Decompositions

The branch adds about 620 lines of production code and selectors, and about 815 lines of tests, in 17 commits (1,436 lines in total). It touches shared editor code in one place only: `WorkflowGraph.vue` gains 7 lines, an `extraRectangles` parameter on `fitWorkflow` and an empty `node-area` slot. These options are for John to choose from later, not recommendations.

**Option 1: one PR on stage 1, squashed into logical commits.** The 17 commits record hardening history, and several messages describe intermediate states, such as the down toggle in `e489b5d267d`. A clean series would land in this order:
1. `a5b16ff29b9`: the Selenium `_open_output_kinds_invocation` helper (a test-only refactor of stage 1's test).
2. The shared editor hooks: `fitWorkflow(..., extraRectangles)` and the `node-area` slot (7 lines).
3. The pure layout module `embeddedOutputLayout.ts` and its 18 tests.
4. The feature: `useEmbeddedOutputs`, `InvocationEmbeddedOutputs`, the toggle, the step shrink and the refit in `InvocationGraph.vue`, with Vitest.
5. Bounded collection cards: `InvocationEmbeddedCollection`, plus `InvocationOutputPreview`'s `summarizeCollection` option and its tests.
6. The E2E test and the `navigation.yml` selectors.

**Option 2: two PRs, bounded collection summaries first.**
- **PR A:** `InvocationEmbeddedCollection` plus the `summarizeCollection` option. It needs a caller, which would be stage 1's hover popover for collections: a behaviour change to stage 1, which stage 1's scope evaluation left to stage 2 (Scope B there). It lands on stage 1, or folds into it.
- **PR B:** everything else (items 1–4 and 6 of Option 1), on A.
- **Tradeoff:** this gives a smaller feature PR, but it changes what the hover shows and repeats stage 1's review of the collection preview.

**Option 3: fold stage 2 into stage 1's PR.** Stage 1 has no PR yet. A single "outputs in the invocation graph" PR would have stage 1's commits followed by Option 1's series.
- **Benefits:** one review of the shared `InvocationOutputPreview`, and the reviewer sees why `outputItems` exists.
- **Costs:** the standing-branch plan pictures stage-sized PRs, and stage 1 is already polished and waiting for John's read-through. The combined diff would be about 2,300 lines.

A PR with only the layout module (Option 1, items 2–3) isn't listed: it would add a module with no caller.

## As implemented (recommended)

An "Embed Outputs" toggle beside the zoom controls turns each labeled workflow output that has produced something into a static card beside its step: 260×170 for datasets, 260×120 for collections, with a summary and the first two elements. Steps shrink to 9rem, and a one-pass constraint layout pushes them right just enough. The graph refits, and toggling off restores the author's positions.

| Pros | Cons |
|---|---|
| - Meets stage 2's brief and John's go/no-go rule, measured on the test workflow and four IWC layouts (offline), and on three live replicas<br>- Answers every open question in the brief with a recorded decision: down mode dropped, static cards, constant sizes per kind, and no lazy loading needed at measured sizes<br>- Bounds very large outputs, the item stage 1 handed to this stage: a 500-element card fell from 2.49 MB to 7.4 KB<br>- Shared-code footprint is 7 lines in `WorkflowGraph.vue`, and the editor is unaffected<br>- Adds no stage 3 hooks | - The minimap doesn't show cards<br>- Unlabeled outputs and inputs marked as outputs get no card<br>- About 50 or more labeled dataset outputs would queue requests behind the client limiter<br>- At ATAC-seq's size the 25% minimum zoom makes cards thumbnails until you zoom in<br>- When the author overlapped steps, an edge can end up running backwards |

## Contraction: drop stage 2 (the go/no-go)

Don't ship stage 2, as John's rule allows if nudging can't keep layouts recognizable. Stage 3 would then stack on stage 1.

| Pros | Cons |
|---|---|
| - No layout code to maintain | - The rule's condition isn't met: no card detaches, there are 0 flips on four of five workflows and 19/1722 on ATAC-seq, and rows and columns stay intact<br>- Stage 3's dedup rule ("don't extract and nudge a separate embedded node") assumes stage 2 exists |

## Contraction: drop the collection summary card

Render collection cards through stage 1's `CollectionDisplay` as the spike did, or skip collection outputs entirely.

| Pros | Cons |
|---|---|
| - About 80 fewer production lines, and no `summarizeCollection` branch in the shared preview | - With `CollectionDisplay`, every card downloads every element on toggle (measured: 2.49 MB, 5.85 s, 38k DOM nodes for four 500-element lists)<br>- Skipping collections would leave out a whole kind of output, and the test workflow has one<br>- Stage 1's scope evaluation assigned this bound to stage 2 |

## Expansion: embed unlabeled workflow outputs

Stage 1's `invocationOutputItems` already resolves unlabeled outputs by their `"<output> (Step N)"` key, so this is roughly a one-line filter change plus a fallback label.

| Pros | Cons |
|---|---|
| - Matches the invocation's Outputs list for older workflows | - None of the 8 IWC workflows in the scratch set has an unlabeled workflow output; IWC requires labels<br>- Older `.ga` workflows often mark every output, so embedding them could put a card beside nearly every step, which is the case nudging handles worst<br>- A card titled "out_file1 (Step 7)" says little, and the hover popover already previews those outputs |

## Expansion: cards for workflow inputs marked as outputs

This is the performance pass's finding D. The cause is now confirmed: the model has the output, and the editor-style download (`_workflow_to_dict_editor` in `lib/galaxy/managers/workflows.py`) leaves out `workflow_outputs` for input steps on purpose (`if output.workflow_step.type not in input_step_types`). The graph loads that style, so the client never sees the output. The invocation does list it (`output_collections.big_in`, on the input step). A client fix would drive cards from the invocation's outputs rather than `step.workflow_outputs`. It would also cover unlabeled outputs (previous section).

| Pros | Cons |
|---|---|
| - Every output the Outputs tab lists would get a card | - The input node already names the dataset or collection, and stage 1's hover previews it, so nothing is hidden<br>- None of the 8 IWC workflows marks an input as an output<br>- Changing the editor serialization would affect the editor, so it's out; the client route is a new way of finding outputs, with its own tests<br>- A card beside an input pushes the first tool column, the part of the layout users recognize most |

## Expansion: draw cards in the minimap

`WorkflowMinimap` draws steps from the step store, which holds the nudged positions. So the minimap already shows the nudged layout and is missing only the cards.

| Pros | Cons |
|---|---|
| - The overview would match the canvas | - The minimap is shared editor code with its own canvas renderer and bounds. It would need an extra-rectangles input, as `fitWorkflow` got, and more editor footprint<br>- Nothing is misplaced: steps sit where the canvas has them, and cards are always within a card width of their step |

## Expansion: load or stagger dataset cards once they come into view

Mount a card's preview only when it intersects the viewport, or stagger the loads. Each dataset card makes two requests, and the limiter allows 100 per 3 s (performance follow-up A).

| Pros | Cons |
|---|---|
| - Removes the request burst for very output-heavy workflows<br>- The brief raised lazy loading as a question | - Speculative: the largest measured workflow (ATAC-seq, 14 cards) made at most 28 requests in any 3 s window<br>- The limiter queues requests rather than failing them, so the worst case is a delay, not breakage<br>- Lazy loading adds viewport tracking under the graph's transform, and cards popping in during pan and zoom |

## Expansion: help large workflows past the 25% minimum zoom

ATAC-seq fits at 25% before and after embedding, so its cards are about 65×42 px on screen. Options are a lower minimum fit zoom while embedding, or smaller cards on large graphs.

| Pros | Cons |
|---|---|
| - Cards on large workflows would be readable without zooming | - The bottleneck is the existing fit minimum, not the nudging: the layout stays recognizable<br>- A lower zoom makes steps unreadable too, and size-by-graph cards change the layout and the measurements<br>- The user can zoom to the part they care about, which is what the feature's users (who know the layout) do |

## Expansion: fix the author-overlap edge-order case

This comes from the thermo-nuclear review. When the author overlapped steps, the edge rule can read a step's x before that step settles, so an edge may end up running backwards. Nothing overlaps. Fixing it means settling in topological order as well, or iterating.

| Pros | Cons |
|---|---|
| - Closes the last known layout irregularity | - It needs author-overlapped steps, which no measured workflow has<br>- No overlap results: the layout's invariants (no new overlaps, right-only moves, kept row order) still hold<br>- Reintroducing iteration risks the runaway that the one-pass layout removed; the Codex fix already covers the overlap case that did matter |

## Expansion: reopen the recorded decisions

The options are down mode or an automatic direction, interactive cards, size by datatype, and mixed-axis placement.

| Pros | Cons |
|---|---|
| - Down mode helps one tall workflow (ATAC-seq); interactive cards would allow pagination in place | - Each was measured and decided, and the reasons are recorded in the initial implementation debrief: down mode distorts more and can flip direction mid-run, interactive cards block panning over a third of the graph, and sizing by datatype makes the graph jump<br>- Mixed-axis placement belongs to stage 3's growth question, and the brief excludes stage 3 |

<details>
<summary>Items considered and left out without their own section</summary>

- **Editor-wide size-only tracking** (performance follow-up B). While embedding is on, scrolling still re-summarizes step sizes in O(n²). The root cause is `useNodePosition` storing position and size together, so the fix is an editor change for its own PR. The cost is measured as small at 42 steps.
- **Unbounded `CollectionDisplay` in the hover popover and reports** (stage 1 follow-up). The cards no longer use it. Bounding the popover would change stage 1, as in Option 2 above.
- **Mapped-over step state reading `ok`** (stage 1's Scope A). Cards inherit it: a card for a map-over whose jobs are all still pending may load before they finish. John dropped it on 2026-11-03, so it isn't re-raised here.
- **Re-layout mid-run when a late-scheduled step's outputs appear.** Workflow output datasets exist from scheduling, and polling a running invocation measured 0 re-layouts. Steps scheduled later (after a subworkflow, for example) would re-lay out once when their outputs appear, which is acceptable.

</details>
