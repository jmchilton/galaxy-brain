Run via claude-opus-5-5.

# Rebase on stage 1 debrief: invocation_graph_embedded_outputs

The spike is rewritten as the hardened stage 1 branch plus the spike's stage 2 and stage 3 work. Head `4187ad166e4` on `jmchilton`, force-pushed over `3e4312f7c1d` with a lease. The parent is `invocation_graph_output_previews` at `90cdc7089d9`, on `dev` `66760b89269`. The untouched spike is still on `jmchilton/invocation_graph_embedded_outputs_spike` (`3e4312f7c1d`, on `dev` `2cca8565861`).

## Commits

| Stage | Commit | What | From spike |
|---|---|---|---|
| 2 | `817479c5bbc` | Embed Outputs toggle, embedded cards in a new `node-area` slot, shrunk steps, and the nudge layout module with tests | `5f33ad43ffa` |
| 2 | `c2e370cad4d` | Layout fixes: steps that share a row keep their order and the author's spacing; the layout reruns when measured step sizes settle | Stage 2 parts of `9a47ea37cb1` and `0de2c009db3` |
| 2 | `c02e81ef4e3` | `fitWorkflow(extraRectangles)`, refit after toggling, controls moved beside the zoom buttons, card image height | Stage 2 parts of `e9914764686` |
| 2 | `fb8d4487040` | Smaller cards: 300×200, and 300×140 for collections | Collection height from `06f13135728`, sizes from `9e83906a728` |
| 3 | `aae406bc3b2` | `preferred_output` (model property, editor and `.ga` dicts, store type, editor star), steps rendered as their preferred output, and base-size-aware layout | `16d2ddff843`, plus the stage 3 parts of `9a47ea37cb1`, `06f13135728`, `0de2c009db3` and `3e4312f7c1d` |
| 3 | `4187ad166e4` | Preferred-output steps sized like the cards: 18.75rem wide, 10rem preview | Stage 3 parts of `9e83906a728` |

**Stage boundary:** the last stage 2 commit is `fb8d4487040`. `invocation_graph_output_previews..fb8d4487040` is stage 2 and can be extracted as a prefix.

**Dropped:** `4054f126c5e` and `1b3b00c9502` are fully covered by stage 1. The stage 1 parts of `06f13135728` (`outputItems`, `invocationStepId`, `useStepOutputItems`), `e9914764686` (compact preview CSS) and `3e4312f7c1d` (freshness on state change) were dropped too, since stage 1 has hardened versions.

## How stage 2/3 code was adapted to stage 1

- **Embedded cards** (`InvocationEmbeddedOutputs.vue`) pass `:step` to `InvocationOutputPreview`, which now requires it, instead of the spike's `:step-state`. A `cards` computed pairs each embedded output with `props.steps[output.sourceId]` and drops outputs whose step is missing. Cards now show stage 1's "not ready yet" placeholder while the step runs.
- **Preferred output in `Node.vue`.** The spike's popover code is gone, because stage 1 moved it to `InvocationStepOutputsPopover.vue`. The preferred-output block uses `useStepOutputItems(invocationStep)` (the existing non-optional `GraphStep` computed) instead of the spike's `GraphStep | undefined` ref.
  - It reads `items` only while the step is shown as its preferred output, so other steps don't fetch their step details.
  - It calls `load()` on show and on step-state changes. That uses stage 1's refetch-after-state-change rule.
- **Layout module split.** `baseWidth`/`baseHeight` came with stage 3 in the spike, but the row-order fix that used them landed later. Stage 2 now has a base-free version of the row ordering. Stage 3 adds the base sizes and the two "step that grew" tests. The final module and its tests are byte-identical to the spike's.
- **`SHRUNK_STEP_SIZE`** stays in stage 3, as in the spike. Stage 2 falls back to 150×60 for unmeasured steps.
- **Unlabeled workflow outputs.** Stage 1 now lists unlabeled workflow outputs in `outputItems`. `useEmbeddedOutputs` still embeds only labeled ones, as the spike did. Conservative call: left unchanged.
- **Merge with `dev`:** `InvocationGraph.vue` gained fit-to-page and the expand-step modal on `dev`. The spike's imports, controls and styles were merged alongside them.

## Fixes made during the rebase

- **mypy (CI config):** two errors in the spike's model code. The `preferred_output` setter had no return annotation. Assigning a dict to `WorkflowStep.config` failed because the column was annotated `Mapped[bytes | None]` although it's a `JSONType` holding a dict.
  - Fixed in `aae406bc3b2`: the setter returns `-> None`, and `config` is annotated `Mapped[dict[str, Any] | None]`.
  - The only other `WorkflowStep.config` user in `lib/` is `copy()`.

## Spike tree vs new tree

On the files either branch touches:

- **Identical:** `NodeOutput.vue`, `WorkflowGraph.vue`, `embeddedOutputLayout.ts` and its test, `useEmbeddedOutputs.ts`, `workflowStepStore.ts`, and the `preferred_output` hunks in `managers/workflows.py`.
- **Stage 1 hardening:** `InvocationOutputPreview.vue`, `useStepOutputItems.ts`, `InvocationStepOutputsPopover.vue` and its test, `useInvocationGraph.ts` and its test, `navigation.yml`, the Selenium test and `CollectionTree.vue`. In `Node.vue`, the popover tag plus `topOutputTerminal()` replace the spike's popover.
- **Adaptation:** the `:step` and `cards` changes in `InvocationEmbeddedOutputs.vue`, and the `useStepOutputItems(invocationStep)` block in `Node.vue` (see above). The `model/__init__.py` typing fix.
- **`dev` drift (`2cca8565861` to `66760b89269`):** everything else, including `InvocationGraph.vue`'s import list and `onUnmounted`, and the unrelated parts of the Python files. With `dev` changes factored out, the branch's own `InvocationGraph.vue` and `managers/workflows.py` diffs match the spike's.

## Verification

- **Vitest** (node 22.20.0) on `Workflow/Editor`, `Workflow/Invocation`, `WorkflowInvocationState` and `useInvocationGraph.test.ts`, layout tests included:
  - At the head: 54 files, 495 tests pass.
  - At the stage 2 boundary `fb8d4487040`: 54 files, 493 tests pass.
- **`vue-tsc --noEmit`** is clean at the head and at `fb8d4487040`. It needs `NODE_OPTIONS=--max-old-space-size=8192`, or it runs out of memory.
- **eslint:** no errors on the changed client files; the warnings are all pre-existing. Prettier is clean.
- **Python:** ruff and black are clean. mypy shows no errors in the new code; the remaining errors in those files are pre-existing.
  - The spike touched no Python tests.
  - `test/unit/workflows/test_modules.py` and `test/unit/data/model/test_model_store.py` pass (`-p no:postgresql`; 181 passed, 1 xfailed).
  - A scratch check of the `preferred_output` getter and setter on `WorkflowStep.config` passes.
- **Not run:** Selenium, or a live browser run of stages 2 and 3.

## Open items

- `MY_BRANCHES.md` and the standing branch record still show the spike's head `3e4312f7c1d` and the `dev` compare link.
- The standing record lists a stage 2 child, `invocation_graph_embedded_workflow_outputs`, that has no branch or record yet. Extract it from `invocation_graph_output_previews..fb8d4487040`.
