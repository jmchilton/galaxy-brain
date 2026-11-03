Run via claude-opus-5-5 at high effort.

# Thermo-nuclear code quality review: invocation_graph_output_previews

This review used `vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md` on `git diff origin/dev...HEAD`: 11 files, about 850 added lines. It read the earlier debriefs first, so it didn't undo their deliberate decisions. I applied the changes myself and folded them into the hover commit as a fixup. The hover commit is now `0218a754863` (was `fed2fba09b6`), and the E2E commit, rebased on top, is `1170a01d959` (was `ba71db68c7f`). The first commit, `bfebdc89f3d`, is unchanged.

## Verdict

There are no structural regressions and no presumptive blockers. No file crosses 1,000 lines: `useInvocationGraph.ts` is at 492 and `Node.vue` at 546. The shared code gains few special cases: `Node.vue` gets one `v-if="isInvocation"` tag and a target function, `CollectionTree.vue` one `data-description`, and `useInvocationGraph` one guarded call per step. The new logic lives in three small modules under `Workflow/Invocation/Graph/`. What I found were contract and state-model problems inside those modules, and I fixed those.

## Findings and changes

### 1. Optional `step` contracts that no caller uses (fixed)

`InvocationOutputPreview` declared `step?: GraphStep`, and `useStepOutputItems` took `Ref<GraphStep | undefined>`. The only caller, the popover, always passes a step: its own `step` prop is required, and `Node.vue` passes `invocationStep`, which is typed as `GraphStep`. `GraphStep.state` is also required. The optionality therefore added an extra `stepState` computed, a `!!stepState.value &&` guard, `?.` on every read, a `!!` coercion in `allListed`, and `| undefined` in the module map's value type. None of these could ever see `undefined`.

The `step` contract is now required in both places. The `stepState` computed is gone, and `notReady` is one line. Stage 2 will pass `props.steps[output.sourceId]`. If that lookup can miss, stage 2 should handle the miss where it does the lookup, rather than the preview guarding against a value it never receives today.

### 2. Three watchers over the same two sources in the popover (fixed)

The popover had three watchers:

- `watch([show, state]) → load()`
- `watch(show) → previewsMounted = true`
- `watch(state) → if hidden, previewsMounted = false`

Together they make up a single rule, and a reader had to put it back together from three places. They are now one watcher on `[show, step.state]`:

- When the popover is shown, it mounts the previews and calls `load()`.
- When the popover is hidden and the step's state changed, it unmounts them.

I checked all four transitions against the old watchers (open, close, a state change while shown, a state change while hidden) and the new watcher behaves the same in each. Two mutations confirm the tests still pin the behavior. Dropping the unmount branch fails "keeps its previews between hovers until the step's state changes". Never handling `shown` fails 5 of the 7 popover tests.

I considered making `previewsMounted` a computed, `show || shownUnderState === step.state`, which removes the flag. I rejected it. During a map-over the step's state can flip `running` ↔ `ok` (performance finding A). If the state flips back to the last-shown state while the popover is hidden, the computed would remount the previews, and a remounted collection fetches. That would break the "a hidden popover makes no requests" property, which the performance step chose on purpose.

### 3. Reactive state that nothing reads reactively, under a name that collides with the preview's map (fixed)

`useStepOutputItems` kept `loadedUnderState = ref<string>()`. Only `load()` reads it, and `load()` is not a reactive context, so the `ref` bought nothing. It was also typed `string` rather than `GraphStepState`. It shared its name with `InvocationOutputPreview`'s module-level `loadedUnderState` map, which is a different concept: one records when step details were fetched, the other when dataset content was loaded. It is now `let fetchedUnderState: GraphStepState | undefined`, and `load()` destructures the step once instead of repeating `graphStep?.`.

### 4. Test cleanups (fixed)

- In `InvocationOutputPreview.test.ts`, two JSDoc blocks were stacked on `producedBy`. The first one described `mountPreview`, so I moved it there.
- In `InvocationStepOutputsPopover.test.ts`, "keeps its previews between hovers..." copied `openPopover`'s mount-and-open code just to pass different stubs. `openPopover` now takes an optional `stubs` argument, and the test uses it.

## Checked and declined

- **Make `items` side-effect-free and `load()` the only fetch path.** Reading `items` calls `getInvocationStepById`, which fetches when the item is missing. That's the "magic" the normal review warned about for stage 3. A non-fetching read would also let `allListed` go. I declined it for two reasons. First, the fetch-on-read getter is the canonical `useKeyedCache` idiom: `WorkflowInvocationStep.vue` reads the same store entry the same way. Second, the getter goes through the retry gate. After a retryable error (429 or 5xx), the gate's backoff timer re-triggers the getter and the request is retried. An explicit `load()` records the state before it fetches, so it would not retry until the step's state changes. Switching would lose retries and add a `storedInvocationSteps` export to the shared store. Stage 3's per-node use still needs the batched or lazy source the normal review suggested. That's a stage-3 design decision, not a stage-1 refactor.
- **Drop `GraphStep.outputItems` and always fetch step details.** This would delete `invocationOutputItems`, `updateOutputItems` and four tests. But stages 2 and 3 read `outputItems` to embed workflow outputs without fetching per step. The performance step also measured the "fully listed steps fetch nothing" property and kept it. I kept it too.
- **The module-level freshness map, and `:key` on `CollectionDisplay`.** These are two freshness mechanisms, because the two displays cache differently. The dataset stores cache by id, so a dataset needs an explicit refetch. `CollectionDisplay` has no cache, so remounting it is the refetch. Both mechanisms are deliberate: see the normal review (finding 2) and the performance debrief.
- **Background fetch from a hidden, mounted dataset preview.** Suppose a step goes from one terminal state to another while its popover is hidden. Both the parent's unmount watcher and the child's refetch watcher fire in the same flush, so the child might refetch. I probed this with a throwaway Vitest file, not committed: the state was mutated in place, as `useInvocationGraph` does, and also through `setProps`. Neither path made a request, because the parent's watcher and re-render run before the child's watcher, so the child is torn down first. Not a bug.
- **`notReady`'s subworkflow special case.** It's a single, documented condition inside the component that owns the concept, and it's what stages 2 and 3 will reuse. Moving it into `GraphStep` would mean changing `updateStep`'s state derivation, and that is the existing TODO the codex review left alone.
- **`updateOutputItems` also sets `invocationStepId`.** The name says less than the function does, but the docstring says both. The id is only there so the step's outputs can be found, so it belongs with them. Not worth renaming.
- **`topOutputTerminal()` queries the DOM by class.** The terminals are rendered by `NodeOutput` children, so a template ref can't reach them. It's a stable function, so GPopover doesn't rebind. Kept.
- **The non-interactive popover and previews kept mounted between hovers.** Both are deliberate decisions from earlier steps, and this review found no reason to reverse either.

## Verification

- Vitest (node 22.20.0) on `Workflow/Invocation/Graph/`, `Workflow/Editor/` and `useInvocationGraph.test.ts`: 42 files, 431 tests, all pass.
- eslint: no errors. The 8 warnings in `Node.vue` and `useInvocationGraph.ts` already exist on dev. prettier: clean.
- `vue-tsc --noEmit`: clean.
- Selenium `test_hover_previews_step_outputs` (Playwright backend, against the running 8092/5182 servers): passes (110 s), and all four screenshots were taken. The first attempt errored during setup on `Page.goto` (30 s timeout). It ran while vue-tsc held the CPU and Vite recompiled the edited files. The test itself never ran on that attempt. After I confirmed both servers respond, the rerun passed.
