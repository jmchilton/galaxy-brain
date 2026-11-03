Run via claude-opus-5-5 at high effort.

# Thermo-nuclear code quality review: invocation_graph_embedded_workflow_outputs

This review used `vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md` on `git diff invocation_graph_output_previews..HEAD`, at head `f451840df2e` (14 commits). I read the earlier harden debriefs and stage 1's thermo-nuclear review first, so their decisions stand.

I made five changes. Behavior is unchanged except for one detail: the connector now starts at the rectangle the layout placed the step at. Head moves from `f451840df2e` to `b718de0e2bc`, with 16 commits. Every commit hash changed, because the layout module now lives under `Invocation/Graph/` in every commit.

## Verdict

There was no structural regression and no file near 1,000 lines. The largest changed file is `InvocationGraph.vue`, at 496 lines. There was no scattered feature branching in shared code either: `WorkflowGraph.vue` gains only a fourth `fitWorkflow` parameter and an empty slot, and the editor is unaffected.

The problems were all within the feature. The card layer rebuilt data the composable already had. The not-ready and reload rule existed twice. The layout ran its rules in two phases where one pass is enough. And an invocation-only module sat in the editor's directory.

## Changes

### 1. The card layer rebuilt the composable's model: new commit `4d24725f497`

`InvocationEmbeddedOutputs` took three props: `storeId`, every step, and `embedded`. It had two computeds that each looked up an output's step by id. One of them dropped outputs whose step was missing. The other read the step's measured size from the state store to start the connector.

The composable already has all of this when it lays out. The outputs come from the steps, and the layout places each step at its measured size. So each `EmbeddedOutput` now carries its `step` and `stepRect`, the step's laid-out rectangle, and `sourceId` is gone. The cards take a single `embedded` prop and draw it: no store, no lookups and no orphan case. The connector starts at the rectangle the card was placed beside, so the connector and the card always agree.

Steps are created once and then changed in place (`useInvocationGraph.updateSteps`), so holding the step object is safe. The fallback size for a step that hasn't been measured yet is now the named constant `UNMEASURED_STEP`. The card test lost its orphan fixture and store setup. A composable test now pins `stepRect`.

### 2. Two copies of the "not ready / reload on state" rule: folded into `449eeac7af2` (summarize collections)

`InvocationEmbeddedCollection` copied stage 1's subworkflow-aware `notReady` rule, its "isn't ready yet" message, and a state watch with a stale-response check. The card then chose between it and `InvocationOutputPreview` with its own `src === 'hdca'` check.

Now `InvocationOutputPreview` takes a `summarizeCollection` option and shows the summary as one more branch, keyed by step state like `CollectionDisplay`. The summary component loses its `step` prop, `notReady`, the state in its watch, and the not-ready message. It now just loads a collection id. The card passes `summarize-collection`, so the preview owns every not-ready and reload decision.

The not-ready and reload test moved to `InvocationOutputPreview.test.ts`. It runs `running`, then `ok`, then `error`, and checks that no request is made while not ready, then one summary and element request per terminal state, with no `CollectionDisplay`. Both mutations I tried fail it: removing the `:key`, and never taking the summary branch. The commit message gained a paragraph about this.

### 3. The layout's rules, in one pass: folded into `9c5be8e7618` (one-pass layout)

The layout gathered every rule into a `bounds` map through a `keepRight` closure, then relaxed the map in a second loop. A reader had to check that the relaxation order matched the collection order.

The pairwise rules are now a pure `minimumOffset(earlier, later)` function. It holds the four rules with their comments, unchanged. Each step settles at the maximum of its own x, every earlier step's x plus `minimumOffset`, and its upstream steps' x plus the edge length. The `bounds` map, `keepRight` and the second loop are gone.

Other cleanups:
- Stack heights no longer carry a trailing gap, so the four `- gap` corrections went.
- The five-number `rowsOverlap` now takes two `{top, bottom}` spans, from `rowsOf` and `stackRowsOf`.

The file went from 155 to 172 lines, mostly because of the named span helpers. It holds fewer concepts, though.

**Equivalence check.** A scratch test compared the old and new layouts on 30,000 random layouts. 30% of them let steps overlap, they used mixed widths, and some cards' source steps were missing. The results matched exactly. The existing 20,000-layout property fuzz is still clean (0 bad cases), and all 18 layout tests pass unchanged.

### 4. An invocation-only module in the editor's directory: moved in every commit

`embeddedOutputLayout.ts` and its test lived in `Workflow/Editor/modules/`, but only `useEmbeddedOutputs` uses them. They now sit beside it in `Workflow/Invocation/Graph/`. That leaves the branch's editor footprint at `WorkflowGraph.vue` alone.

I rewrote the 16 commits mechanically with `git filter-branch --tree-filter`: it moved the two files and changed the import path in the composable and its test. The rewrite was conflict-free. The import keeps the `@/components/...` alias, which `InvocationGraph.vue` also uses for its siblings, so no commit's import order changed. Compared with the pre-move head, only the rename and those 4 import lines differ. No commit message named the old path.

### 5. Two fits with copied arguments: new commit `b718de0e2bc`

The fit on load and the refit after embedding both wrote out `fitWorkflow(0.25, 1.0, 20.0, ...)` with their own `@ts-ignore`. They now share a `fitGraph(extraRectangles = [])` helper.

## Checked and declined

- **`fitWorkflow`'s fourth positional parameter.** Callers that need only the rectangles must repeat three defaults, and an options object would read better. But the editor and the published view call this shared API too, and the helper above hides the problem in the only caller that passes rectangles. Not worth changing shared code.
- **The 300 ms debounced refit with `fitPending`.** This is a heuristic for "layout settled": a toggle lays out twice, once with pre-shrink sizes and once after the measured sizes arrive. Nothing reports that sizes are final, so a real signal would need new editor state. Kept.
- **Positions written to both the `GraphStep` and the step store.** `WorkflowGraph` draws from the steps prop, while the bounding box and minimap read the store. The double write follows the existing architecture, not this branch.
- **Pairwise O(n²) rules.** The performance pass measured this as fine at real sizes.
- **`@ts-ignore` on the template ref.** This is an existing pattern (`WorkflowPublished.vue` has the same call). It now appears once.
- **The settled decisions** (right-only pushes, pinned and static cards, constant card sizes, a one-pass layout, the collection summary). I found no reason to revisit any of them.

## For John

The edge rule can read a step's unsettled x when the author overlapped steps. Here is a constructed case. A wide source `s` (x 0–400, with a card) overlaps a step `from` (x 100–200) in its row, and `from` feeds a step `to` (x 250) in another row. `from` settles after `s` and is pushed past the card to x 700. `to` settled earlier at 250, so the edge now runs backwards. Nothing overlaps; only the edge length isn't kept.

This happens only with steps the author overlapped. It also predates this review: the old two-phase code gave the identical result, and the equivalence check covered such cases. I didn't change layout behavior in a quality pass. It joins the author-overlap cases the test-challenge and Codex passes looked at.

## Verification

- Vitest (node 22.20.0) on `src/components/Workflow/Editor`, `src/components/Workflow/Invocation` and `src/composables/useInvocationGraph.test.ts`: 47 files, 465 tests, all pass. That's one new preview test, one removed collection test, and a smaller card test.
- `vue-tsc --noEmit`: clean.
- eslint: no errors. The 13 warnings (`v-on-event-hyphenation` in `WorkflowGraph.vue` and `@stepClicked` in `InvocationGraph.vue`) already exist. I reverted one autofix, because `@step-clicked` wouldn't match Vue 2's camelCase `stepClicked` emit. prettier: clean.
- Selenium (Playwright backend, the worktree's running servers): `test_embed_workflow_outputs` and stage 1's `test_hover_previews_step_outputs` both pass (162 s together). The connector assertions pass with the new connector start. The embedded screenshot shows all six cards, connectors and the collection summary.
- Scratch files are in `scratchpad/thermo2/`: the equivalence test `equiv.test.ts`, the pre-change layout `old_layout.ts`, and `shots/`. The worktree is clean, and nothing was pushed.
