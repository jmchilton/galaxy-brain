Run via claude-opus-5-5 at high effort.

One refactor commit now sits on `origin/dev` before the feature: `8366af2b2b6` generalizes the Selenium helper `_open_two_branches_invocation` into `_open_invocation(workflow, labels)`.

## Refactor commit

`8366af2b2b6 Invocation graph Selenium tests: open any workflow's invocation`

- In `lib/galaxy_test/selenium/test_workflow_invocation_graph.py`, the body of `_open_two_branches_invocation` becomes `_open_invocation(workflow, labels)`. That helper runs the workflow, opens the latest invocation, waits for the labeled steps to reach `ok` and waits for polling to stop. `_open_two_branches_invocation` is now a one-line call to it. The six existing tests behave the same.
- Before this split, the change sat inside the E2E commit (`1170a01d959`). That commit now only adds the new workflow, `test_hover_previews_step_outputs` and its helpers.

## History after the restructure

```
5fb3b314b52 E2E test for invocation graph output previews
b1da79e2130 Invocation graph: hover a step's outputs to preview them
9506e07804f Invocation graph steps carry the datasets and collections the invocation lists
8366af2b2b6 Invocation graph Selenium tests: open any workflow's invocation
```

The base is unchanged (`577c683a957`, still `origin/dev`). The new tip's tree is byte-identical to the old tip `1170a01d959`, and `git diff 1170a01d959 5fb3b314b52` is empty. Only the E2E commit hit a conflict during the rebase, and it was resolved by taking the old tip's version of the test file.

## Left in place

- **`data-description="collection element name"` on `CollectionTree.vue`.** It's pure DOM decoration, but its only consumer is the feature's `graph_step_output.collection_element_name` selector and the new hover test. On the base it would be an unused hook, so it stays in the E2E commit, next to its selector and test.
- **`useInvocationGraph.ts`.** `GraphStep.outputItems`, `invocationStepId`, `updateOutputItems` and `invocationOutputItems` are all new behavior. Nothing there restructures existing code.
- **`Node.vue`.** The popover mount and `topOutputTerminal()` are feature code only.
- **`navigation.yml`.** The new selectors exist only for the new test.

## Verification

- At `8366af2b2b6` (the worktree was checked out there, so the running Vite server served that tree): `test_workflow_invocation_graph.py::TestWorkflowInvocationGraph::test_step_card_navigation` passed. It goes through the refactored helper. `ruff check` and `ruff format --check` are clean.
- At `9506e07804f`: `useInvocationGraph.test.ts` passed (42 tests).
- At `b1da79e2130`: `useInvocationGraph.test.ts`, `Workflow/Invocation/Graph/` and `Workflow/Editor/Node.test.ts` passed (6 files, 68 tests).
- At the tip `5fb3b314b52`: the `HistoryDatasetCollection/` and `Workflow/Invocation/Graph/` suites passed (5 files, 19 tests). The tip's tree matches the previously verified tip, so the full E2E file was not re-run.

The worktree is clean, on branch `invocation_graph_output_previews` at `5fb3b314b52`. Nothing was pushed.
