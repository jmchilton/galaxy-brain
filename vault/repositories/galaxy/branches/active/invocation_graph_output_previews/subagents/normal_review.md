Run via claude-opus-5-5 at high effort.

# Normal review: invocation_graph_output_previews

Acted on (implementer, folded into the branch's commits): dropped the never-filled `invocationStep.outputs` loop and its test (1); matched unlabeled workflow outputs by the invocation's `"<output> (Step N)"` key (4); refetched step details only once the step's state changed (5); showed "This output isn't ready yet: the step is <state>." while the step's jobs are non-terminal, so running outputs no longer load or show "No content found" (6); typed `stepState` as `GraphStepState` (8); tightened the Selenium assertions to row counts, the first table row and exact text (9). Vitest and the full `test_workflow_invocation_graph.py` file pass (8/8) afterwards.

Not acted on, and why:

- (2) Kept the `loadedUnderState` Map. A check on the dataset's own state wouldn't cover the popover's own remounts: history polling overwrites `datasetStore` entries (`saveDatasets`) with a terminal state but never refreshes `datasetTextContentStore`, so stale content would stay. The Map also covers a failed step rerun with remapped outputs, which keeps dataset ids. With the new not-ready placeholder, the popover no longer loads datasets while their job runs. The remaining gap (content cached by another view while running) is documented in the implementation debrief.
- (3) Kept the tooltip-role popover. An `interactive` popover needs a focusable trigger; the output terminal is a plain `div`, and axe rejects `aria-haspopup`/`aria-expanded` on it. A real trigger means new UI on every node, which is a decision for John. The step card stays the keyboard route. Recorded as an open question.
- (7) HTML/PDF iframes remount on each hover: noted for stage 2, where cards stay mounted.
- (10) `mount` in the popover test is needed to render the slot; kept.
- The reviewer's `localStorage` failure came from running vitest under node 26; under `client/.node_version` (22.20.0) everything passes.

The reviewer's own summary: no blockers; one code path never ran against the real API, the stale-preview logic used a module-level Map, and the previews contain controls a keyboard user can't reach.

<details>
<summary>Full review</summary>

## Findings, by severity

### Medium

1. **`invocationOutputItems` reads `invocationStep.outputs`, which the invocation payload never fills.** See `client/src/composables/useInvocationGraph.ts:485-490`. The invocation's steps are serialized with `view="collection"` (`WorkflowInvocation.to_dict`, `step_details=False`), and the schema defaults `outputs` and `output_collections` to `{}`. No client code requests `step_details`. The function's own docstring says these fields are empty. So the third loop never runs in production, and the test "includes outputs listed on the invocation step" (`useInvocationGraph.test.ts:472`) covers a payload shape the server doesn't send. Per REVIEW_FOCUS ("code that keeps never-working input alive"), drop the loop and its test, unless stage 2/3 will feed step-detail payloads through this function. In that case, say so in the docstring.

2. **The module-level `loadedUnderState` Map can miss stale cache entries and adds global state.** See `InvocationOutputPreview.vue:20-41`. A preview is treated as stale only when it was *already in the Map* under a different step state. So the first mount trusts whatever `datasetStore`/`datasetTextContentStore` already hold. Those stores are app-wide, and other views fill them: the invocation report tab renders the same `HistoryDatasetDisplay`, and so do `DatasetView` and `DatasetDetails`. Suppose the dataset was cached while its job ran and the graph preview first mounts after the job finishes. The Map records `ok` and never refetches. The preview then shows the stale "running" content.

   The Map is also never cleared, and the tests need distinct ids (`d1`/`d2`/`d3`) because state leaks between tests. A stateless check would be simpler and more correct: on mount, and when `stepState` changes, refetch when the cached dataset's own `state` is non-terminal. Once a dataset is terminal its content doesn't change. That removes the Map, handles caches other views filled, and stage 2/3 can reuse it with no shared mutable module state. If you keep the Map, document the caches-filled-elsewhere gap.

3. **The tooltip-role popover holds interactive controls that a keyboard user can't reach.** See `InvocationStepOutputsPopover.vue:39-46`. `CollectionDisplay` has no embedded mode and renders Download/Import buttons plus `CollectionTree` toggles. Tabular `HistoryDatasetDisplay` renders a `BPagination`, and truncated text renders a "Show More" link. The output terminal isn't focusable, so the previews are mouse-only. GPopover's own contract is that APG tooltips hold nothing focusable, so `role="tooltip"` is semantically wrong for this content. Mouse users can hover into the popover and click these controls; keyboard and screen-reader users can't reach them at all.

   Choosing a non-interactive popover is defensible only if the content is also non-interactive. Two fixes would make it consistent. One: add an `embedded` (header-less) mode to `CollectionDisplay`, mirroring `HistoryDatasetDisplay`'s, and keep previews free of controls. The Selenium assertion on "Dataset Collection: lines" would then need another anchor. Two: give the node a real focusable trigger, such as a small button, so `interactive` works. Either way, the step card stays the keyboard-accessible route to the same outputs. Mention that in the PR.

### Low

4. **Workflow-output matching misses unlabeled workflow outputs.** See `useInvocationGraph.ts:474-482`. When a workflow output has no label, the backend keys it as `"<output_name> (Step <order_index+1>)"` (`model/__init__.py`, `WorkflowInvocation.to_dict`). The client compares `workflow_output.label === label`, and that label is null, so these outputs fall through to an extra step-details request on hover. The result is still correct because the details fetch covers it. Older workflows often have unlabeled outputs, though. The loop can also be simpler and O(W) per step instead of O(outputs × W): iterate `step.workflow_outputs`, look up `invocation.outputs[label] ?? invocation.output_collections[label]`, and fall back to the synthesized key. Polling cost is otherwise fine. The per-step JSON-stringify diff matches the existing `jobs` pattern, and only changed objects are reassigned.

5. **Every hover refetches step details for outputs that will never exist.** See `useStepOutputItems.ts:40-46`. `load()` refetches whenever any `step.outputs` entry is missing from the items. Some outputs never appear in the invocation step's dataset outputs: parameter outputs of expression tools (`output_value`), filtered or optional outputs that weren't produced, and pause steps. For these steps, every hover of a finished step issues `GET /api/invocations/steps/{id}`. Gate the refetch on the step's state changing since the last fetch, or on the step not yet being terminal.

6. **The previews don't show dataset state.** See `InvocationOutputPreview.vue:46`. Hovering a queued or running step's outputs shows `HistoryDatasetDisplay` fetching the content of an unfinished dataset. Depending on the endpoint's behaviour, that yields "No content found." or an error message, either of which is misleading. Show the dataset's state, or skip the content fetch, while the dataset is non-terminal. This fits with finding 2.

7. **HTML and PDF outputs load as iframes on every hover.** `HistoryDatasetDisplay` renders `BEmbed` for `html`/`pdf`. The popover content is `v-if="show"`, so every hover remounts the iframe and reloads the full report (e.g. MultiQC). Consider a link or placeholder for these datatypes in previews. That decision also matters for stage 2's embedded nodes.

8. **`stepState` is typed as `string`.** See `InvocationOutputPreview.vue:14`. It should be `GraphStepState`, which this file already depends on from `useInvocationGraph`. That matters more once stage 2/3 pass it from other places.

9. **The Selenium assertions are weak.** `"3" in text` (`test_workflow_invocation_graph.py:288`) and `"68" in table.text` (`:270`) would pass on many wrong renders. Assert the `pre` text exactly for the `output_order` outputs. The test also can't tell the label/step-id match from the step-details fallback, because both render the same preview. That's acceptable since the unit test covers the matching, but a comment would help. The Selenium helpers (`send_escape`, `hover`, `wait_for_absent_or_hidden`) and the new `navigation.yml` selectors follow existing patterns.

10. **The unit tests use `mount` where the README prefers `shallowMount`.** `InvocationStepOutputsPopover.test.ts` needs GPopover's slot rendered, so `mount` with explicit stubs is justified there. In `InvocationOutputPreview.test.ts`, `DatasetDisplayStub` re-implements `HistoryDatasetDisplay`'s store reads. That couples the test to the child's internals, but it's the simplest way to count requests. It's acceptable, and it would go away under the stateless design in finding 2.

## Things that look right

- `Node.vue` stays clean. It gains one import, one `v-if="isInvocation"` line, and a stable `topOutputTerminal` function. Being a stable function reference, it doesn't trigger GPopover's rebind watcher the way an inline arrow would. The editor path is unaffected. Pulling an Invocation component into the editor `Node` is a mild layering wart, but `NodeInvocationText` already sets that precedent.
- Anchoring on the topmost stacked terminal is correct: invocation terminals are `position-absolute` on one spot, and the last one in the DOM receives the pointer. `GPopover` with `v-if="previewable"` mounts once the step is scheduled and resolves its target then.
- Parameter inputs and unscheduled steps are correctly excluded. Subworkflow steps work: `set_step_outputs` records subworkflow step outputs on the invocation step, and parent `invocation.outputs` carry the subworkflow step's `workflow_step_id`. Skipped steps still have output datasets, which preview in the skipped state. Matching on `label` + `workflow_step_id` is sound, since both ids are encoded the same way (`InvocationIOBase.workflow_step_id`, `InvocationStep.workflow_step_id`).
- Hover request volume is bounded. There is the open delay, at most one step-details request (deduped by keyedCache), two requests per dataset (cached afterwards), and one per collection per open. `allListed` skips the details fetch when the workflow outputs cover every output.
- Fitness for stage 2/3: `InvocationOutputItem`, `GraphStep.outputItems`/`invocationStepId` and `InvocationOutputPreview` are cleanly shaped for reuse, and the `--invocation-output-image-height` hook is a sensible extension point. One caution for stage 3: `useStepOutputItems.items` fetches step details as a side effect of being read. If stage 3 reads it for every node at render to pick a preferred output, that becomes one request per non-fully-listed step on graph load, with no refresh on state change. Plan for a batched or lazy source there rather than reusing `items` as-is.

## Verification

- `npx vitest run` on the 3 changed or new test files: 55 of 56 passed. The single failure is environmental (`window.localStorage` undefined under Node v26.13.0), and the same failure occurs in unrelated `src/components/Markdown/**` dev tests.
- `npx eslint` on the changed client files: 0 errors. The warnings are all pre-existing.

</details>
