# Initial review: galaxyproject/galaxy#24299

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Claude Opus 5.5, effort: low (as run)
- Reviewed commit: `90a64400825b8c396f4a8e30efb84bb6a8cf7d57` (4 commits on `dev` merge-base)
- Scope: 5 client Vue files, +141/-27

## Verdict

Small, nicely scoped UI change and the route-level layout matches the history graph view. One real regression: `is-full-page` is also used by the post-run success page (`WorkflowRunSuccess`), whose parents have no definite height, so the new fill-height chain shrinks the graph to the `min-height: 400px` floor minus the header. Beyond that, the 50/50 split CSS is a second copy of `HistoryGraphOverview`'s instead of a shared layout, and the new expand-to-modal flow has no test even though there's a Selenium file for this card.

## Findings

### P1 1: Post-run success page collapses the invocation graph

`WorkflowRunSuccess.vue` renders `<WorkflowInvocationState is-full-page success />` inside a plain `<div>`, inside `<span>`s in `WorkflowRun.vue`. Nothing in that chain has a definite height. So the new `.full-page { height: 100%; min-height: 400px }` on the `WorkflowInvocationState` root resolves to `auto`. Every level below it uses `flex: 1 1 0; min-height: 0`, which contributes zero intrinsic height. The root therefore sits at exactly 400px. After the `WorkflowNavigationTitle` header, progress bars and nav pills, the overview gets only what's left. The graph used to get a fixed `60vh` there via `:fixed-height="60"`, which the PR now drops when `isFullPage` is set. The success path also forces the header open (`WorkflowInvocationState.vue:265`, `headerCollapsed.value = false` when `success`), which leaves the graph even less room. This is the first view users see after every workflow run.

<details><summary>Evidence</summary>

I reproduced it with a static Chromium model of the PR's flex chain: same `flex`/`min-height`/`overflow` rules, a 200px header and a 50px nav. This models the CSS only. It was not run in a live Galaxy.

| Container | Graph height (no step selected) | Graph / step card (step selected) |
|---|---|---|
| Definite-height parent (900px), like the `/workflows/invocations/:id` route | n/a | 325 / 325 |
| Plain auto-height `<div>` in `<span>`s, like `WorkflowRun` -> `WorkflowRunSuccess` | 150 | 75 / 75 (step body ~56px scroll area) |

</details>

Suggested fix: either give the success page a height chain (`WorkflowRun`'s wrapper and the `WorkflowRunSuccess` root as `h-100 d-flex flex-column`, with the invocation state as `flex: 1`), or split the "route fills the viewport" behaviour off `isFullPage`. `isFullPage` currently means "show header/nav", not "parent provides a height". In the second case, keep `:fixed-height="60"` when no height is available. Check the multi-invocation `GridInvocation` branch of `WorkflowRunSuccess` too, though it doesn't pass `is-full-page`.

### P2 1: 50/50 graph/details split duplicated from `HistoryGraphOverview` instead of shared

The PR says it mirrors the history graph view, and the CSS does mirror it almost line for line: `graph-pane` `flex: 1 1 0` -> `with-details` `flex: 0 0 50%`, a details pane at `flex: 1 1 0; min-height: 0`, an `overflow: hidden` container, and an inner `overflow-y: auto; overflow-x: hidden` scroll boundary. Compare `client/src/components/History/Graph/HistoryGraphOverview.vue` with the new `.full-page` block in `InvocationGraph.vue`. The "fill remaining column height" stanza (`display: flex; flex-direction: column; flex: 1 1 0; min-height: 0`) also appears 4 more times across `WorkflowInvocationState.vue`, `WorkflowInvocationOverview.vue` and `InvocationGraph.vue`. That leaves two graph views with the same layout contract and two copies to drift. The P1 above is the kind of bug a shared, documented abstraction would surface once.

Suggested fix: extract a small layout component (e.g. `GraphDetailsSplit` with `graph`, `details` and `empty` slots, plus a `hasDetails` prop) used by both `HistoryGraphOverview` and `InvocationGraph`. Or at least add an SCSS mixin / utility class for the fill-column stanza in `client/src/style/scss/flex.scss` or `mixins.scss`, which already hold layout mixins like `two-rows-header` and `fill`. A follow-up is fine if the author prefers.

### P2 2: Expand-to-modal flow and full-page layout are untested

No tests were added. `lib/galaxy_test/selenium/test_workflow_invocation_graph.py` already covers this card (`test_step_card_navigation`, `test_step_config_is_read_only`) and has `invocations.step_card*` selectors in `navigation.yml`. A short Selenium test would cover the new behaviour and guard the Teleport wiring: click a tool node, click "Expand Step", assert the step body (e.g. `step_card_config_tab`) is visible inside the `dialog`, then dismiss via the in-card "view the details here instead" link and assert the body is back in the card and the dialog is closed. Add a `step_card_expand` selector (and a `data-description` on the button) rather than matching on title text.

### P3 1: Inline `style="overflow-x: hidden"` on `FormTool`

`WorkflowInvocationStep.vue` adds `style="overflow-x: hidden"`. Bootstrap's `overflow-x-hidden` class is already used in this area (the `WorkflowInvocationState` root). Prefer the class.

### P3 2: Expand button only for tool steps

`v-if="activeStep.type === 'tool'"` hides "Expand Step" for subworkflow, input and pause steps. The PR description says the button appears on "active step displays" in general. If this restriction is intentional (e.g. those bodies are always small), fine. Otherwise subworkflow step bodies can be large too. Worth a one-line answer from the author.

### P3 3: Small cleanups in `InvocationGraph.vue`

- The comment `// Collapse the step card whenever the active step changes` describes closing the modal (`stepExpanded`), not the card. Something like "Close the expanded-step modal when the active step changes" would be accurate.
- The Teleport target id `invocation-step-modal-${invocation.id}` assumes one `InvocationGraph` per invocation in the DOM. `useUid` (already used by `GModal`) would avoid that assumption at no cost.
- `scrollStepToView()` now has an `isFullPage` guard, and its only full-page caller is `stepClicked` (the button is `v-if="!isFullPage"`). Fine as is. In full page, a re-click could instead scroll the card body to top, but that's optional.

## Notes (no action needed)

- Removing `workflow-invocation-state-component` from `WorkflowInvocationOverview` is safe: nothing in `client/src`, `navigation.yml` or the Selenium tests references it.
- The modal lives inside `.invocation-step-card` in the DOM, and `GModal` always renders its `<dialog>`, so the deferred Teleport target exists and the existing `.invocation-step-card ...` Selenium selectors still match while expanded. Teleport moves the step component rather than remounting it, so tab and job state survive expand/collapse.
- Constraining the root height in full page also changes the other tabs (Steps, Report, Export, Metrics): they now scroll inside `.tab-content-container` instead of the page. That looks intended and matches the history graph view, but the report tab is worth a quick manual check.
- The shared `WorkflowInvocationStepHeader` root gains `align-items-center w-100`, which also affects its other caller in the Steps tab (`WorkflowInvocationStep.vue`). Probably harmless; check it visually.
