Run via claude-opus-5-5 at high effort.

# Test challenges debrief: invocation_graph_output_previews

I challenged every new test against `doc/source/dev/writing_tests.md`, `client/README.md#client-side-unit-testing` and the vault E2E notes. The changes were folded into the branch's existing commits, so history stays at three commits:

| Commit | What |
|---|---|
| `94c3576a979` | unchanged (`useInvocationGraph` output items) |
| `fc363569dda` | was `519305782b2`. Tests rewritten as below, plus a `data-description="invocation step output label"` hook on the popover's output label. |
| `f34be4674aa` | was `f560972f84c`. The Selenium test now asserts output labels, and a `graph_step_output_label` selector was added. |

There is no "Baseline tests" commit, and none is needed: every test covers new behavior.

## Per test

### `useInvocationGraph — output items` (4 tests): kept as is

- These cover the mapping from the invocation payload to `GraphStep.outputItems`: the workflow input's item, workflow outputs matched by label and `workflow_step_id`, the unlabeled `"<output> (Step N)"` key, and the reactive update when polling lists a new output.
- Selenium can't tell a label match from the step-details fallback, because both render the same preview. So this layer is the only one that pins the matching.
- They follow the file's existing `setupComposable` pattern and add no new mocks beyond one dataset endpoint. I considered exporting `invocationOutputItems` and testing it as a pure function. I didn't, because the polling test needs the composable anyway, and the through-composable tests also check the wiring.

### `InvocationOutputPreview.test.ts` (5 tests): kept all, swapped the mocks for a noop stub

- **Removed `DatasetDisplayStub`.** It re-implemented `HistoryDatasetDisplay`'s store reads only so the child's first load showed up in the request counts. That coupled the test to the child's internals, which the normal review had also flagged. The test now uses `shallowMount` with `stubs: { CollectionDisplay: false }`. `HistoryDatasetDisplay` is a noop auto-stub, so the dataset request counts are only the preview's own reloads: `{}` before a state change, one details request and one content request after it. The collection display stays real, because its own mount-time fetch is the observable for the `:key` remount.
- **The "not ready" test now uses a collection.** With the dataset display stubbed, "without loading it" would hold for an hda no matter what the component did. With the real `CollectionDisplay`, dropping the not-ready branch makes it fetch, and the text assertion fails too.
- **Dropped the `as object` cast**, so `setProps` is typed. `vue-tsc` rejected `setProps` on a `shallowMount(X as object)` wrapper.
- "keeps a dataset shown again under the same step state" is a negative test. It fails if the preview refetches on every mount, which pairs it with the "reloads ... after its step's state changed" test.

### `InvocationStepOutputsPopover.test.ts` (6 tests, now 5)

- **Dropped "fetches the step's details for outputs the invocation doesn't list".** The Selenium test covers it end to end: `cat_table` is all-fetched, and `numbers` mixes a listed `output_b` with a fetched `output_a`, with both values asserted. The state-change refetch test also still runs through the merge path.
- **Hand-written stubs replaced by `shallowMount`.** `getLocalVue()` sets `renderStubDefaultSlot`, so the auto-stubbed `GPopover` still renders its slot, and `update:show` is emitted from the stub. `findComponent(InvocationOutputPreview).props("item")` works on the auto-stub.
- **The label is now read through `data-description="invocation step output label"`** instead of the `.font-weight-bold` styling class. Selenium uses the same hook.
- Kept "previews every output the invocation lists without fetching the step", which is the `allListed` no-request property and can't be observed in Selenium. Also kept the empty state, the state-gated refetch, and the `it.each` for unscheduled steps and parameter inputs.

### Selenium `test_hover_previews_step_outputs`: strengthened

- The comment "a workflow output, listed with its label" wasn't backed by any assertion. The test now asserts that the label is `top_rows` for `head_table`, and `out_file1` (the output name) for the non-workflow-output `cat_table`.
- Replaced `[row.text.split() for row in rows[:1]] == [[...]]` with `rows[0].text.split() == [...]`.
- Re-ran the test alone against the running servers (Playwright backend): passed in 112s.
- Layout faking: none. The preview's image `max-height` and the popover width are CSS only, and no test asserts pixels.

## Fails-without-change check

I ran targeted mutations of the implementation, restoring each file afterwards. Each one fails the test that covers it, at that test's own assertion:

| Mutation | Fails |
|---|---|
| drop the `updateOutputItems` call | all 4 output-items tests |
| no unlabeled `(Step N)` key / no `workflow_step_id` filter / no input item | the one matching test each |
| preview never refetches | the two reload-a-dataset tests |
| preview always refetches | those two, plus "keeps a dataset ..." |
| no `:key` on `CollectionDisplay` | the collection reload test |
| no not-ready branch | the not-ready test |
| `allListed` ignored | "previews every output ... without fetching" |
| `load()` ignores state / loads only once | the state-change refetch test |
| `previewable` always true | both `it.each` cases |
| no empty message / no workflow-output label | their tests |

## Verification

- Vitest (node 22.20.0) on `useInvocationGraph.test.ts`, `Workflow/Invocation/Graph/` and `Workflow/Editor/`: 42 files, 427 tests, all pass.
- `vue-tsc --noEmit` is clean. eslint reports no errors; the one warning is pre-existing and not in these files. prettier, ruff and black are clean.
- Selenium `test_hover_previews_step_outputs` passes.

## Not changed

- The module-level `loadedUnderState` map still leaks across tests, which is why each test uses distinct dataset ids. I didn't add a test-only reset.
- No new E2E coverage for the not-ready placeholder, parameter inputs or unscheduled steps. Each would need a slow or paused job, or a different workflow, so the unit layer is the right place for them.
