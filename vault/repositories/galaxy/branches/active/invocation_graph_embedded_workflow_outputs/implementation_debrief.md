Run via claude-opus-5-5 at high effort.

# Implementation debrief: invocation_graph_embedded_workflow_outputs

**STATUS: READY.** Stage 2 of [invocation_graph_embedded_outputs](../../../../../agents/gx_standing/standing_branches/invocation_graph_embedded_outputs/index.md) is hardened. An "Embed Outputs" toggle on the invocation graph turns each labeled workflow output into a static card pinned beside its step. Steps shrink and are pushed right just enough to make room, and the graph refits. Toggling off restores the author's layout.

Head `4d64ca21529` on `jmchilton`: 19 commits on `invocation_graph_output_previews` (`90cdc7089d9`), +1484/−17 lines in 14 files, client and Selenium only. Scope evaluation: **keep scope**.

```
exists /home/ubuntu/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/invocation_graph_embedded_workflow_outputs/differential-review/snapshots/20261103T214343Z-hardening-4d64ca215297.json
  hardening @ 4d64ca215297 vs invocation_graph_output_previews (merge-base 90cdc7089d9c)
  since 20261103T185924Z-implementation-bacea92a7e48:
    commits: 0 same, 4 rebased, 5 changed, 10 new, 1 dropped
    hunks:   7 carried, 8 changed, 17 new, 5 dropped
```

## Decisions (for John)

Evidence is in [initial_implementation_debrief.md](initial_implementation_debrief.md).

1. **Right only; down mode dropped.**
   - Once cards stay pinned beside their step, right mode moves steps less than down on four of five workflows (dada2 is a tie at zero).
   - Down won only on ATAC-seq, and it made the test workflow 4× taller.
   - An automatic per-workflow choice was rejected. It helps one workflow in five, and the direction could flip mid-run.
2. **Static cards.** Cards are `pointer-events: none` and `inert`. They cover about a third of the graph, and interactive cards blocked panning and zooming over that area. The full, interactive preview stays one hover away (stage 1) and in the step card.
3. **Constant sizes:** 260×170, and 260×120 for collections. Sizing by datatype needs a request per card before layout, or a re-layout that makes the graph jump. Compared with the spike's 300×200, these sizes move fewer steps and flip fewer orders.
4. **Collection cards show a summary:** the collection name, the history panel's description, and the first two element names plus "and N more". The hover popover still shows the full `CollectionDisplay`.
   - Four 500-element lists went from 2.49 MB and 5.85 s to 7.4 KB and 0.41 s (performance pass).
   - This is a visible change from the spike's tree-with-peeks.
5. **The layout is one pass over fixed constraints:**
   - Steps never change rows, so every rule is a lower bound on a step's x relative to a step settled before it, and one sorted pass satisfies them all.
   - It cannot run away, unlike the fixed-point loop the normal review broke (x≈205000).
   - A 20,000-layout fuzz is clean: no overlaps, no left or vertical moves.

## Layout measurements (go/no-go: go)

Offline at 260×170, on real positions and edges. Live runs cover the test workflow and IWC layout replicas:

| Workflow | Steps / cards | Moved | Largest move | Fit zoom before → after | Order flips |
|---|---|---|---|---|---|
| Output previews (live: same) | 10 / 6 | 3 | 368 | 91% → 55% | 0 |
| IWC ChIP-seq PE (live: 4 moved, each by 49px) | 12 / 9 | 5 | 49 | 38% → 33% | 0 |
| IWC CUT&RUN | 15 / 10 | 5 | 603 | 41% → 29% | 1/210 |
| IWC dada2 paired | 19 / 3 | 0 | 0 | 31% → 28% | 0 |
| IWC ATAC-seq (live: 21 moved, max 527) | 42 / 14 | 17 | 354 | 25% → 25% | 19/1722 |

No card detaches on any of these. The spike's algorithm moved CUT&RUN's steps up to 4467px and left a card 340px from its step on the test workflow.

## Hardening

- **Normal review** ([subagents/normal_review.md](subagents/normal_review.md)):
  - The blocker was a runaway push loop, replaced by the one-pass solver.
  - Also fixed: the toggle is disabled with nothing to embed, cards are inert, `apply`/`restore` hygiene, and a less brittle E2E check.
- **Test challenges** ([test_challenges_debrief.md](test_challenges_debrief.md)):
  - Four layout rules were pinned by new tests; surviving mutations went from 12 of 30 to 2.
  - A size-change test now models the real sequence.
  - Selenium checks connectors, pointer pass-through and focus.
- **E2E polish** ([polish_e2e_tests_debrief.md](polish_e2e_tests_debrief.md)):
  - Fixed a possible flake: it now waits for rows to render before counting them.
  - Added toggle `aria-pressed` checks, shared helpers, and named geometry constants.
  - All 9 tests in the file pass.
- **Performance** ([performance_challenges_debrief.md](performance_challenges_debrief.md)):
  - The layout runs at most once per frame: ATAC-seq went from 43 runs to 2.
  - Collections are summarized in cards.
  - Step sizes are read only while embedding.
  - Polling a running invocation causes no re-layouts.
- **Codex** ([codex_review.md](codex_review.md)):
  - One confirmed defect, fixed with a test: an author-overlapped row-mate could sit under a card.
  - The sandbox can't run on this host, so the files went on stdin.
- **Thermo-nuclear** ([thermo_nuclear_review.md](thermo_nuclear_review.md)):
  - No blockers.
  - Cards now get everything they draw from the composable.
  - There is one not-ready rule, in `InvocationOutputPreview`.
  - The layout rules are a pure function.
  - The layout module moved to `Workflow/Invocation/Graph/`.
  - The two refit calls share one `fitGraph` helper.
- **Baseline refactor** ([baseline_refactor.md](baseline_refactor.md)): one leading test-only commit, `a5b16ff29b9`, moves stage 1's opening of the invocation into a Selenium helper.
- **Scope** ([scope_evaluation.md](scope_evaluation.md)): keep scope. It lists three PR decompositions without choosing one.
- **Check branch:**
  - `make format` is clean.
  - mypy on the Selenium file shows 18 errors against 17 on stage 1. The extra one is the new `@selenium_test` method, left unannotated like the file's other tests.
  - Two new helpers were annotated, and a `no-any-return` was fixed.
  - vue-tsc, eslint (no new warnings) and prettier are clean.
- **Screenshots** ([screenshot_debrief.md](screenshot_debrief.md)):
  - 14 frames at 1280×1000, all with the invocation's own history:
    - toggle before/after on "Output previews", plus a 100% close-up;
    - ChIP-seq PE whole graph and 50% flip frames, plus the MACS2 three-card stack;
    - an ATAC-seq 50% region flip;
    - running and finished frames, whole and at 90%.
  - The not-ready message in cards got padding.

**Final verification:**
- Vitest on `Workflow/Editor`, `Workflow/Invocation` and `useInvocationGraph` passes: 47 files, 465 tests. The Workflow graph files pass at the screenshot head.
- `test_embed_workflow_outputs` and `test_hover_previews_step_outputs` pass (Playwright). The full file passed in the E2E polish pass.

## Open questions (for John)

- **Commit history.** The spike-era commits describe intermediate states; for example, `e489b5d267d` still mentions the down toggle. The 19 commits want squashing into a few logical ones at polish. Scope evaluation option 1 suggests six.
- **Pagination row in table cards.** Table cards show a "« ‹ 1 › »" row that can't be used on inert cards (frames 07, 08 and 10). Hiding it is a small CSS follow-up; I left it because it would mean re-taking those frames.
- **Gaps to mention in the PR, not fix:**
  - Cards aren't drawn in the minimap.
  - Unlabeled workflow outputs aren't embedded.
  - A collection input that is also a labeled output gets no card: the editor dict leaves out input steps' `workflow_outputs`, deliberately.
  - Large workflows are already at the 25% minimum fit zoom.
  - About 50 or more dataset cards would queue behind the client rate limiter on toggle.
  - With author-overlapped steps, an edge can end up running backwards (no overlap results).
- **PR shape:** one PR, or fold into stage 1's (scope evaluation, Possible Decompositions).

## Notes for rebasing the spike (stage 3) onto this branch

- **Moved:** `client/src/components/Workflow/Editor/modules/embeddedOutputLayout.ts` and its test are now in `client/src/components/Workflow/Invocation/Graph/`. Stage 3's layout edits target the old path.
- **Layout API rewritten.** Take stage 2's version and re-add stage 3's growth on top, rather than merging:
  - `layoutEmbeddedOutputs(nodes, requests, edges)` has no `direction`, `gap` or `maxIterations` options. The gap is `EMBEDDED_LAYOUT_GAP`.
  - The result is `{ nodes, embedded }`, with no `maxDisplacement` or `movedNodeIds`. `LayoutRect` is replaced by `Rectangle` from `@/utils/geometry`, and `NudgeDirection` is gone.
  - Rows come from each node's own y and height. A preferred-output step that grows is simply a taller or wider `LayoutNode`, so the spike's `baseWidth`/`baseHeight` row-ordering and its two "step that grew" tests need re-deriving against the constraint rules.
- **Composable:**
  - The signature is `useEmbeddedOutputs(storeId, steps, enabled)`, with no direction, and it returns `{ embedded, hasEmbeddableOutputs }`.
  - `EmbeddedOutput` dropped `sourceId` and gained `step` and `stepRect`.
  - The layout runs at most once per animation frame, and step sizes are read only while enabled.
  - Stage 3's dedup rule belongs in `collectRequests`: a preferred output that is also a workflow output gets no card.
- **Cards:** `InvocationEmbeddedOutputs` takes only `embedded`; there is no `storeId` or `steps` prop and no state-store reads.
  - Cards are inert and pointer-transparent.
  - Collections go through `InvocationOutputPreview`'s new `summarizeCollection` prop, which renders `InvocationEmbeddedCollection.vue`.
  - Stage 3's in-node preview should decide the same static-versus-interactive question.
- **Sizes:** cards are 260×170 (collections 260×120), down from 300×200. Stage 3's preferred-output step size (18.75rem wide, 10rem preview) should shrink to match, for example 16.25rem. Unmeasured steps fall back to 150×60, and stage 3's `SHRUNK_STEP_SIZE` can replace that.
- **`InvocationGraph.vue`:**
  - The `nudgeDirection` ref and button are gone.
  - The `.embed-outputs-controls` wrapper is replaced by `.embed-outputs-button`. The button is disabled with "No workflow outputs to show yet" until a labeled output has produced something.
  - The refits go through `fitGraph(extraRectangles)`.
- **Selenium:**
  - New helpers: `_open_output_kinds_invocation`, `_drop_focus`, `_settle_for_screenshot`, `_zoom_in_around`, `_client_rect` and `ClientRect`.
  - New selectors in `navigation.yml`, under `invocations.graph_embed_*`, `graph_embedded_*`, `graph_node_area` and `graph_zoom_reset`.
