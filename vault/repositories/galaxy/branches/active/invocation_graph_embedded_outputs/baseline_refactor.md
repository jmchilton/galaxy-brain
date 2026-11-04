Run via claude-opus-5-5 at high effort.

The branch now starts with four commits directly on stage 2 (`invocation_graph_embedded_workflow_outputs`, `3b546b24e6f`): one baseline test and three refactors.
- The baseline test checks that embedding outputs leaves no two steps overlapping.
- The refactors are the static output snapshot component, the per-output step item helpers, and the shared Selenium static check.

The four feature commits follow, unchanged apart from two reworded messages. The final tree is byte-identical to the old head `d3401e83e21`.

## New commits on stage 2

| Commit | What |
|---|---|
| `653d182602f` | **Baseline test.** `_assert_cards_beside_their_steps` also checks that no two steps of WORKFLOW_OUTPUT_KINDS overlap. `ClientRect.clear_of` allows `EDGE_TOLERANCE` on every edge. |
| `0720597e8d8` | **Refactor.** `InvocationOutputSnapshot.vue` takes over the card body's static-snapshot rules. The card's summarize test moves to the snapshot's test. |
| `bd924cb211b` | **Refactor.** `useStepOutputItems.ts` gains the exported `stepOutputItem` and `useStepDetailsRefetch`. `items` uses them. |
| `12a1541b48b` | **Refactor.** `_assert_static(snapshots, controls)` is extracted from `_assert_embedded_outputs_static`, with label-keyed failure messages. |

### Details

- **No-overlap check (`653d182602f`).**
  - On stage 2, the check shows that steps pushed to make room for the cards push their neighbours clear.
  - The comment says that on stage 2. The E2E commit rewrites it to head's wording about grown steps.
  - The tolerance change already applied to stage 2's cards-clear-of-steps check at head. It moves here with the check that needs it.
- **Snapshot component (`0720597e8d8`).**
  - The new component and its test are exactly head's versions, and so are the card component and its test.
  - Behaviour doesn't change: stage 2's card and its container were already pointer-transparent and inert, so the snapshot's own `inert` and `pointer-events: none` repeat them.
  - On stage 2 the component has one consumer. It names a concept stage 2 already recorded as a decision (static snapshots), and it removes 15 lines of churn from the graph commit.
- **Step output items (`bd924cb211b`).** The file is head's version. It refactors stage 1 code, with two small behaviour changes for the hover popover, its only consumer:
  - Items are the stored details objects, not `{ src, id }` copies. So reevaluating `items` no longer re-renders the previews. This is the performance pass's identity fix, now applied to stage 1's popover from the start.
  - `items` covers only the step's own outputs. The popover reads only those.
  - The popover's existing tests pass unchanged.
  - `stepOutputItem` and `useStepDetailsRefetch` are exported but only used in their own file until the graph commit. I exported them here so the graph commit doesn't touch the file.
- **`_assert_static` (`12a1541b48b`).** A restructuring of existing test code. Stage 2's embed test checks the same things, with reworded failure messages.

## Rebased feature commits

| New | Was | Change |
|---|---|---|
| `5ad9d6ef9ce` | `83d9c442144` | none |
| `13851278be8` | `5ead23684d4` | none |
| `c445a047e1d` | `32de0e2140f` | Message reworded: the preview *is* the existing `InvocationOutputSnapshot`, and it resolves items through `useStepOutputItems`' helpers. The diff loses the snapshot and helper extraction. |
| `30194041da4` | `d3401e83e21` | Message reworded: the no-overlap check and the shared static check are no longer this commit's. It now says the card assertions take the expected cards and `_open_invocation` passes run options through. The diff loses those hunks. |

- The cherry-pick had one conflict, in the Selenium file at the E2E commit. I resolved it by taking the original commit's version, which is the final version.
- From the graph commit on, every commit's client tree matches its original. The Selenium file differs from the original only before the E2E commit, where the baseline and refactor test edits now sit.
- `git diff d3401e83e21 30194041da4` is empty.

## Left in place

- **`WorkflowStep.config` typing (`bytes` to `dict[str, Any]`), in the backend commit.**
  - It could stand alone. At base, nothing reads the column except `copy_to`.
  - But the column isn't always a dict: legacy rows hold a string, and the new property's `isinstance` guard and comment explain that.
  - On its own, the commit would assert a type that the next commit immediately qualifies. The backend commit's message already names the fix.
- **`_open_invocation(workflow: str | dict, labels, **run_kwds)` and `_assert_cards_beside_their_steps(sources=...)`.** On stage 2, nothing would use the new parameter or the dict type. That follows stage 2's baseline precedent: unused extension points stay with their first user.
- **`Node.test.ts`'s `mountNode(..., provide)` parameter.** Same reason. It's only used by the new preferred-output tests.
- **`EMBEDDED_STEP_WIDTH_REM` and the `v-bind()` widths in `InvocationGraph.vue`.**
  - On stage 2, the 9rem appears only in CSS. The TS constant exists for stage 3's `shrunkStepSize()`, and the 260px width is for grown steps.
  - Moving only the 9rem binding would leave a constant with no TS reader on stage 2.
- **`grewFrom` and the layout changes.** These are the feature, not a restructuring.

## Verification

- **At the baseline tip (`12a1541b48b`)**, with the worktree checked out there so Vite served stage 2's client plus the refactors:
  - Vitest (node 22.20.0) on `Workflow/Invocation`, `Workflow/Editor` and `useInvocationGraph.test.ts`: 48 files, 465 tests pass. Stage 2 had 47 files and 465 tests: the snapshot test file is new, and the card's summarize test moved into it.
  - `vue-tsc --noEmit` is clean. eslint and prettier are clean on the changed client files.
  - ruff, black and isort are clean on the Selenium file at both Selenium commits.
  - E2E (Playwright): `test_embed_workflow_outputs` and `test_hover_previews_step_outputs` pass (176 s). These exercise the new no-overlap check, `_assert_static`, the snapshot cards and the popover's item helpers.
  - The running server's backend is stage 3's, which these tests don't use.
- **At the new head (`30194041da4`):**
  - Vitest on `Workflow/Invocation`, `Workflow/Editor`, `WorkflowInvocationState` and `useInvocationGraph.test.ts`: 59 files, 543 tests pass.
  - `vue-tsc --noEmit` is clean.
  - E2E (Playwright): `test_embed_shows_steps_as_their_preferred_output`, `test_embed_workflow_outputs` and `test_hover_previews_step_outputs` pass (246 s).
- Logs are in `scratchpad/baseline3/`.
- The worktree is clean, on `invocation_graph_embedded_outputs` at `30194041da4`. Nothing was pushed, and the servers weren't restarted.

## For the coordinator

- The branch was rewritten (8 commits on stage 2, was 4), so pushing it needs `--force-with-lease`.

## Coordinator note: reworded

The coordinator renamed the baseline commit to start with "Baseline tests", as AGENTS.md requires. Every SHA changed. The tree is the same and was pushed as `b11aff0ee88`:

```
b11aff0ee88 E2E test for steps shown as their preferred output in the invocation graph
8203d9bf95b Invocation graph: with Embed Outputs on, show steps as their preferred output
ec94746e8cb Workflow editor: star an output as its step's preferred output
58efa4d7b70 Workflow steps can name a preferred output
4e79b66543c Invocation graph Selenium tests: a shared check that previews are static
ceb1944f5a8 Invocation graph: resolve a step's output items one output at a time
33f4b6f7917 Invocation graph: a static output snapshot component for the embedded output cards
ab4332db82a Baseline tests: invocation graph Selenium tests check that embedding outputs leaves no two steps overlapping
```
