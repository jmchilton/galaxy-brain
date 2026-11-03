Run via claude-opus-5-5 at high effort.

The branch now starts with one refactor commit on stage 1 (`invocation_graph_output_previews`, `90cdc7089d9`). `a5b16ff29b9` moves the opening of stage 1's output kinds invocation into a Selenium helper, `_open_output_kinds_invocation`, with the blur in `_drop_focus`.

## Refactor commit

`a5b16ff29b9 Invocation graph Selenium tests: open the output kinds invocation through a helper`

- In `lib/galaxy_test/selenium/test_workflow_invocation_graph.py`, the six opening lines of stage 1's `test_hover_previews_step_outputs` become `self._open_output_kinds_invocation()`. Those lines run the workflow, clear the activity tooltip and blur the focused element. The helper sits just before `_hover_outputs`, where the final tree has it, and calls `_drop_focus()` for the blur. The test behaves the same.
- Before the split, the E2E commit (`e059a7e2b2a`) copied those opening lines inline into `test_embed_workflow_outputs`. A later commit (`d614127bd53`) then pulled both copies into the helper. Now the new test calls the helper from the start, and so does its second blur, before the screenshot. The follow-up commit (now `2881cf99084`) keeps only its real changes to that code: a comment about the toggle's tooltip and focus ring.

## History after the restructure

Head moves from `b718de0e2bc` to `cc779df8662`, with 17 commits. The new head's tree is byte-identical to the old one (`git diff b718de0e2bc cc779df8662` is empty). Each rebased commit differs from its original only in the Selenium test file, and only up to the old `d614127bd53`. From `2881cf99084` on, every commit tree matches its original exactly. The client tree of every commit is unchanged, and the refactor commit's client tree is stage 1's tip.

There were two rebase conflicts, both in the test file. At the E2E commit, I took the original's version and applied the same substitutions. At the connectors commit, I took the original's version, which is also every later commit's version.

## Left in place

- **`fitWorkflow(..., extraRectangles)` and the `node-area` slot in `WorkflowGraph.vue`.** These are new extension points in shared editor code, not restructurings of existing code. On stage 1 they would be an unused parameter and an empty slot, and stage 1's baseline pass also kept such hooks with their feature. They are 7 lines, in the two feature commits that first use them (`e489b5d267d` for the slot, `83cd0fb4b88` for the rectangles), and each commit message names the change.
- **`fitGraph()` in `InvocationGraph.vue`.** The helper exists to share the `0.25, 1.0, 20.0` arguments and the `@ts-ignore` between the fit on load and the refit after embedding. On stage 1 it would have one caller. Its `extraRectangles` parameter also needs the `WorkflowGraph` change above. It stays in the last commit.
- **`InvocationOutputPreview`'s `summarizeCollection` option.** This adds a new branch, `InvocationEmbeddedCollection`, which belongs to this branch. Nothing existing is restructured. On stage 1 the option would have no caller and no component to render.
- **The `_drop_focus()` call that replaces the embed test's screenshot blur.** That blur is in the new test, so it isn't pre-existing code. It now uses the helper from the E2E commit on.

## Verification

- Every commit: `ruff check`, `ruff format --check` and a parse of the Selenium test file pass. Each commit's test file opens `WORKFLOW_OUTPUT_KINDS` in exactly one place.
- At `a5b16ff29b9`, with the worktree checked out there so Vite served stage 1's client: `test_hover_previews_step_outputs` passed (83 s). This test exercises the refactored helper. The commit changes no client code, so vitest there is stage 1's verified result.
- At head `cc779df8662`: vitest (node 22.20.0) on `src/components/Workflow/Editor`, `src/components/Workflow/Invocation` and `src/composables/useInvocationGraph.test.ts` passed: 47 files, 465 tests. `test_embed_workflow_outputs` and `test_hover_previews_step_outputs` both passed (162 s together).
- Logs and screenshots are in `scratchpad/baseline2/`. The worktree is clean, on `invocation_graph_embedded_workflow_outputs` at `cc779df8662`. Nothing was pushed.

## For John

The first feature commit's message (`e489b5d267d`) still says "a second button switches between pushing right and down". A later commit in the history dropped down mode. This pass didn't touch commit messages. That message, and others that describe intermediate states, may be worth a squash or reword before the PR.
