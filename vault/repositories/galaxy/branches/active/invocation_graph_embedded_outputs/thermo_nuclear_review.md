Run via claude-opus-5-5 at high effort.

# Thermo-nuclear code quality review: invocation_graph_embedded_outputs (stage 3)

This review applied `vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md` to `git diff invocation_graph_embedded_workflow_outputs..2164705bc15` (4 commits, 20 files, +894/−66). I read the earlier stage 3 debriefs and stage 2's thermo-nuclear review first. Their decisions stand.

I made four changes, each folded into the commit it belongs to. Behaviour is unchanged at the default 16px root font size. The one visible difference is at other root sizes: a grown step is now exactly as wide as a card (260px), not 16.25rem.

The head moves from `2164705bc15` to `d3401e83e21`. The base is still stage 2 (`3b546b24e6f`).

| Commit | Was | What changed |
|---|---|---|
| `83d9c442144` | same | unchanged (backend) |
| `5ead23684d4` | `e98e41cf423` | the star gets its own tool-only condition (change 4) |
| `32de0e2140f` | `76413f31454` | changes 1-3. The message now describes the shared snapshot and the bound widths, rather than "16.25rem". |
| `d3401e83e21` | `2164705bc15` | rebased only |

## Verdict

There are no blockers.

- **File sizes.** No file crosses 1,000 lines. `Node.vue` is the largest changed client file. It was 584 lines and is about 10 shorter after this review.
- **Backend.** `workflows.py` (2,882 lines) and `test_workflows.py` were already far past 1,000; the branch adds 14 and 64 lines to them.
- **Spaghetti.** Stage 3 adds no feature checks to shared paths outside the invocation graph, apart from the hooks it needs in `Node.vue` and `NodeOutput.vue`.

The problems were duplication: two copies of the static snapshot styling, size constants repeated between CSS and TS, a loosely typed pair of optional sizes, and one borrowed visibility condition.

## Changes

### 1. One static snapshot component for cards and grown steps (graph commit)

Stage 2's card body and stage 3's grown step each wrapped `InvocationOutputPreview` the same way:
- `summarize-collection`;
- `inert` and `pointer-events: none`;
- the 0.75rem font and the 8rem image height;
- the pagination hidden.

That was the same rules, two comments and two places to keep in step. The new `InvocationOutputSnapshot.vue` owns this "static snapshot" concept, which stage 2 recorded as a decision:
- The card renders `<InvocationOutputSnapshot class="embedded-output-body">` and keeps only `flex: 1` and its not-ready inset.
- `Node.vue` renders it with only the two heights.

`Node.vue`'s template loses its `&& !preferredItem` condition. The snapshot and the state text are now one `v-if`/`v-else-if` pair, so a step shows exactly one of them.

Tests:
- `Node.test.ts` and `InvocationEmbeddedOutputs.test.ts` now find the snapshot.
- The card's "summarizes collections" test moved to `InvocationOutputSnapshot.test.ts`. That test fails if `summarize-collection` is dropped (checked).

### 2. `grewFrom` instead of `baseWidth?` and `baseHeight?` (graph commit)

The brief asked whether the layout's base-size concept is the right abstraction. The concept is right. The layout needs two sizes for a grown step:
- the size it had in the author's layout, to tell the author's spacing, overlaps and edge direction;
- the size drawn now, for clearance.

For every other step, the two sizes are the same.

The shape was loose, though. Two independent optionals could be set one without the other, which means nothing, and `baseWidthOf` and `baseRowsOf` each had their own fallback.

`LayoutNode.grewFrom?: { width; height }` states the invariant as "both or neither", and names the concept after its comment. The helpers read `(step.grewFrom ?? step).width` and `.height`. The composable passes `grewFrom: preferredItems[id] ? base : undefined`, so the conditional spread is gone.

The tests changed shape only. Dropping `grewFrom` from the row rule still fails 6 layout tests (checked).

### 3. The graph's step widths come from the layout's constants (graph commit)

Stage 3 introduced two CSS/TS mirrors:
- `shrunkStepSize()` hard-coded the `9rem` from `InvocationGraph.vue`'s `.embed-outputs` rule.
- The grown step's `16.25rem` was meant to mirror `EMBEDDED_OUTPUT_WIDTH = 260`.

`useEmbeddedOutputs.ts` now exports `EMBEDDED_STEP_WIDTH_REM = 9`. `InvocationGraph.vue` styles both widths with Vue's `v-bind()` in CSS, an existing pattern (`GCard.vue`, `GenericWizard.vue`):
- `9rem`, from `EMBEDDED_STEP_WIDTH_REM`;
- `260px`, from `EMBEDDED_OUTPUT_WIDTH`.

The layout's assumptions and the styles can no longer drift. As a side effect, "as wide as an embedded output card" now holds at any root font size.

### 4. The star has its own condition (editor star commit)

The star reused `showCalloutVisible`, the dataset-visibility toggle's condition. If that toggle were ever extended to subworkflow steps, the star would follow silently, and saving would then fail with a 400 from the backend's tool-only check. `showCalloutPreferred` now states the tool-only rule with that reason.

## Checked and declined

- **Node's `isInvocation` guard.** Both the composable (`detailedStepId`) and `Node.vue` (`isInvocation`) exclude the detailed-view step. Two sources of truth are a smell. But the guard errs in the safe direction: if they disagree, the layout only gets an underestimated base size, which adds pushes, never overlaps. Without the guard, an editor-style node would render a preview. Kept.
- **`shownAsPreferredKeys` in the relayout watch.** The test challenge found that it survives mutation. `apply()` reads `preferredItems`, so listing it states a real dependency. Kept.
- **`useEmbeddedOutputs` owning `usePreferredOutputItems`.** The graph could call the two separately and pass the map in. One composable owning embed mode (cards, dedup, base sizes, the toggle rule) is more coherent, and the cost is passing `detailedStepId` through. Kept.
- **The preview heights (8.5rem, 5.25rem) and the 55px base height (`3.3125rem + 2`).**
  - The preview heights mirror a card's body: 170 or 120px, minus a header whose height is in rem.
  - The base height mirrors a measured one-line title.
  - Neither can be derived from a single constant. Both are documented next to their use.
- **Extracting the `preferred_output` validation from `__module_from_dict`.** It sits beside the inline `workflow_outputs` checks, in the same style, and is 11 lines. Kept inline.
- **The branch in the Selenium helper `_open_output_kinds_invocation`.** It exists only because format 2 can't carry the field yet. It's commented, and goes away with the gxformat2 follow-up.
- **The Python model and export.** The property and setter are minimal. The `config` typing fix is correct. The legacy-string guard is commented and tested. Export, import and the editor dict each add one line in the canonical place. Nothing to change.
- **Stage 2 decisions.** Nudge only, push right only, static content, constant card sizes and the one-pass layout all hold. I found no reason to revisit any of them.

## Verification

- **Vitest** (node 22.20.0) on `Workflow/Editor`, `Workflow/Invocation`, `WorkflowInvocationState` and `useInvocationGraph.test.ts`: 59 files and 543 tests pass. That is one new file (the snapshot test) and the card's summarize test moved into it.
- **Mutation checks:**
  - dropping `summarize-collection` from the snapshot fails its test;
  - ignoring `grewFrom` in the row rule fails 6 layout tests.
- **Static checks:** `vue-tsc --noEmit` is clean. eslint shows no errors, only existing warnings. prettier is clean.
- **Python:** nothing changed, so I ran no Python checks.
- **E2E (Playwright, on the worktree's running servers):** 4 passed in 275s:
  - `test_embed_shows_steps_as_their_preferred_output`;
  - `test_hover_previews_step_outputs`;
  - `test_embed_workflow_outputs`, which covers the card markup change;
  - `test_star_preferred_output`.
- **Screenshot.** `invocation_graph_embedded_preferred_outputs` shows head_table and cat_table drawn as their tables, as wide as the cards beside them.
- **Tree.** The autosquashed tree is identical to the tested tree. The worktree is clean, nothing was pushed, and the servers weren't restarted (there were no backend changes).
