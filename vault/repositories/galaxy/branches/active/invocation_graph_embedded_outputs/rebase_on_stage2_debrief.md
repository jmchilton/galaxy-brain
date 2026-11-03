Run via claude-opus-5-5.

# Rebase on stage 2 debrief: invocation_graph_embedded_outputs

The spike is now stage 2 plus four stage 3 commits. Its new head is `6e8a0a965c9` on `jmchilton`, force-pushed over `4187ad166e4` with a lease. The parent is `invocation_graph_embedded_workflow_outputs` at `3b546b24e6f`.

The branch was reset to stage 2's head, and the stage 3 work was reapplied on top, adapted to stage 2's final APIs. Nothing was merged. The spike's four stage 2 commits (`817479c5bbc`..`fb8d4487040`) are gone, replaced by stage 2 itself. The untouched spike is still on `jmchilton/invocation_graph_embedded_outputs_spike` (`3e4312f7c1d`).

## Commits

`3b546b24e6f..6e8a0a965c9`: 16 files changed, +477/−33.

| Commit | What | From spike |
|---|---|---|
| `af4c0230500` | Backend: `WorkflowStep.preferred_output`, stored in `config` (no migration), with the `config` typing fix. It round-trips through the editor dict and `.ga` export/import. New model unit test and API round-trip test. | Python parts of `aae406bc3b2` |
| `7dc25eb1b36` | Editor star toggle on tool outputs (an undoable `UpdateStepAction`) and the `NewStep.preferred_output` type. New `NodeOutput` Vitest tests. | `NodeOutput.vue`, `workflowStepStore.ts` parts of `aae406bc3b2` |
| `9625feb4175` | Invocation graph: a step is shown as its preferred output while Embed Outputs is on. This commit also adds the static-snapshot rules, dedup, the toggle rule, growth in stage 2's solver and the sizes. Vitest for Node, layout and composable. | Client parts of `aae406bc3b2`, all of `4187ad166e4` |
| `6e8a0a965c9` | New E2E test `test_embed_shows_steps_as_their_preferred_output`, plus selectors. Shared helpers: `_assert_static`, and `_assert_cards_beside_their_steps(sources)`, which now also checks that steps don't overlap. | New |

## How stage 3 was adapted to stage 2

- **Layout.** Growth is built on stage 2's one-pass solver (`Invocation/Graph/embeddedOutputLayout.ts`), not the spike's fixed-point loop.
  - `LayoutNode` gains optional `baseWidth`/`baseHeight`, the size a step grew from.
  - Stage 2's single same-row rule now asks whether the two steps shared rows *before* growth:
    - If they did, the spacing is the author's, measured from the base width.
    - If they didn't, it's the full gap.
  - That covers the spike's two "step that grew" cases.
  - The spike's `a.x === b.x` tie-break isn't needed, because stage 2's settle order already puts the upper step first.
  - Edges count as "flowing" by the base width (see the differences below).
- **Composable.**
  - `collectRequests` skips a workflow output that is also its step's preferred output.
  - `apply()` passes base sizes for steps that name a preferred output.
  - `SHRUNK_STEP_SIZE` (144×60) replaces stage 2's `UNMEASURED_STEP` (150×60) as the unmeasured fallback too, as the stage 2 notes suggested.
  - The spike's `preferred-<id>` entries in `requestKeys` were dropped. Stage 2's measured-size watcher already reruns the layout when a step grows.
- **`InvocationGraph.vue`.** `provide("embedInvocationOutputs", embedOutputs)` and a width rule on `.node-preferred-output-host`. These were added to stage 2's version of the file; the direction ref and the old controls were not reintroduced.
- **`Node.vue`.** The spike's block is kept: `useStepOutputItems` items are read only while shown, and `load()` runs on show and on state change. On top of it go the static-card rules (below) and `summarize-collection`.

## Static-card decision

A step shown as its preferred output follows stage 2's static-card rules.

- The preview is `inert` and `pointer-events: none`, with content clipped and a table's pagination hidden.
- Clicking anywhere on the step selects it, which opens the step details with the interactive output. Drags and zooms over it move the graph.
- The spike made the preview scrollable (`@wheel.stop @pointerdown.stop`). That blocked panning, zooming and selecting over the preview, the same problem stage 2 rejected interactive cards for.
- The E2E test checks pointer pass-through, focus and hidden pagination.

## Behavioural differences from the spike's stage 3

1. **Static preview** instead of a scrollable, interactive one (above). Clicking the preview now selects the step; in the spike it didn't.
2. **Collections are summarized.** A collection preferred output uses stage 2's `InvocationEmbeddedCollection` summary (name, description, first two elements) instead of the full `CollectionDisplay` tree.
3. **Sizes.**
   - The width is 16.25rem, down from 18.75rem.
   - The preview is 8.5rem tall with 8rem images, down from 10rem with 9rem images.
   - Collections get a shorter 5.25rem preview, where the spike used one height for everything.
   - These match the 260×170 and 260×120 cards' bodies.
4. **Layout.**
   - It is one sorted pass, with no fixed-point iteration and no down mode: growth only ever pushes steps right.
   - Edge flow is judged by the step's base width, where the spike used its grown width. So a step still carries along a downstream step it grew past, rather than dropping the edge from the carry rule.
   - Every other stage 2 rule applies to grown steps unchanged: cards beside the grown edge, the settle order, and "never left or vertical".
5. **The Embed Outputs toggle is enabled** once a step that names a preferred output is scheduled, even with no labeled workflow output produced. Stage 2's rule alone would have kept it disabled for a workflow whose only output is a preferred one, because dedup removes that card.
6. **The unmeasured step fallback is 144×60** (was 150×60 in stage 2). This affects only the first layout, before steps are measured.

## Verification

- **Vitest** (node 22.20.0) on `Workflow/Editor`, `Workflow/Invocation`, `WorkflowInvocationState` and `useInvocationGraph.test.ts`: 57 files, 528 tests pass.
  - New: 2 NodeOutput, 4 Node, 5 layout and 3 composable tests.
  - Four of the five layout tests fail against stage 2's unmodified solver. The fifth guards cards beside a grown step.
- **vue-tsc** (`NODE_OPTIONS=--max-old-space-size=8192`) is clean. Prettier is clean.
- **eslint:** no errors.
  - The two new warnings are `as any` in the new NodeOutput tests' `shallowMount(NodeOutput as any, …)`, which follows the file's existing pattern.
  - The other warnings were already there.
- **Python:** ruff, black and isort are clean.
  - mypy on `model/__init__.py` and `managers/workflows.py` matches stage 2 error for error.
  - The Selenium file has one more error than stage 2: the new unannotated `@selenium_test` method, left like the file's other tests.
- **Python tests** (`-p no:postgresql`):
  - `test/unit/data/model/test_model.py`, `test/unit/workflows/test_modules.py` and `test/unit/data/model/test_model_store.py`: 197 passed, 1 xfailed.
  - API: `test_preferred_output_round_trip`, `test_long_annotations_round_trip` and `test_export_editor` pass against the worktree's Galaxy. The round trip covers editor update, editor and `.ga` export, `.ga` reimport, and clearing.
- **E2E (Playwright).** All of `test_workflow_invocation_graph.py` was run.
  - The nine stage 1/2 tests pass, `test_embed_workflow_outputs` and `test_hover_previews_step_outputs` included.
  - The new stage 3 test passes; it was rerun alone after fixing the test itself.
  - galaxy-playwright's `galaxy_e2e.sh` is zsh-only, so it was ported to bash in the session scratchpad. The changes: `seq` for the brace range, `printf` for `print`, the Linux selenium-manager path, `dirname` for `:h`.
  - The pytest-postgresql plugin has to be disabled with `-p no:postgresql`, or collection fails with "no pq wrapper available".

## Open questions for stage 3 hardening

- **Base size is a constant guess.** A grown step's base is 144×60. A shrunk step with many terminals is taller, so a pair of rows the author did share can count as "grew into", which gives the full gap instead of the author's tighter spacing. Measuring the pre-growth size would need the node to report it.
- **Grown steps can push their column-mates a long way.** On the test workflow, head_table grows down into cat_table's row, and cat_table grows down into the rows of copy_image's card. cat_table ends up 444px right (260 to 704, live: past the plot card), taking its downstream steps along. Is that acceptable for dense columns, or should a preferred-output step's growth be capped (for example a shorter preview)?
- **Grown steps don't push downstream steps past their new right edge across rows.** An edge can run backwards from a grown step's right edge to a step below it. The same gap exists for stage 2 cards.
- **The star exists only on tool steps**, as in the spike. Subworkflow and input steps can't name a preferred output.
- **Format 2 drops it.** gxformat2's converter drops `preferred_output`, so YAML workflows can't set it and format 2 export loses it. The E2E test sets it on the converted native dict.
- **No validation.** A `preferred_output` naming an output that doesn't exist (for example after a tool upgrade) is stored as is. The graph then shows the step as usual.
- **History.** Commit `9625feb4175` bundles the rendering, layout and composable changes. Split it at polish if reviewers want the layout growth on its own.
