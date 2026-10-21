### P2 1: The graph/details split duplicates `HistoryGraphOverview`'s layout instead of sharing it (implementation verified)

The PR says the overview now fits the page "like the history graph view", and its CSS copies that view almost line for line. Both use a graph pane at `flex: 1 1 0` that becomes `flex: 0 0 50%` once details open, a details pane at `flex: 1 1 0; min-height: 0`, an `overflow: hidden` container, and an inner `overflow-y: auto; overflow-x: hidden` scroll boundary. The "fill the remaining column height" stanza (`display: flex; flex-direction: column; flex: 1 1 0; min-height: 0`) is written out five times across `InvocationGraph.vue`, `WorkflowInvocationOverview.vue` and `WorkflowInvocationState.vue`. That leaves two graph views with the same layout contract and two copies that can drift apart.

<details><summary>Details</summary>

Compare `client/src/components/History/Graph/HistoryGraphOverview.vue` (`.history-graph-overview`, `.graph-pane`, `.graph-pane.with-details`, `.details-pane`) with the new `.full-page` block in `InvocationGraph.vue`.

</details>

Review branch commit `000d2e1355e` adds a `fill-column` mixin to `client/src/style/scss/mixins.scss`, next to the existing `fill`/`absfill` layout mixins, and uses it for all five copies. A fuller fix, fine as a follow-up, would extract a small split component (graph slot, details slot, `hasDetails` prop) and use it in both `HistoryGraphOverview` and `InvocationGraph`.

<details><summary>Evidence</summary>

On a live dev client, the full-page layout measured the same before and after the mixin commit (graph 329px, step card 323px, step body 282px at 1400x900).

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P2 2: No test covers the expand-to-modal flow (implementation verified)

No tests were added. `lib/galaxy_test/selenium/test_workflow_invocation_graph.py` already covers this step card, and the new Teleport between the card body and the modal is easy to break without anyone noticing.

Review branch commit `0a08b2c8866` adds `test_expand_step_to_modal`. It selects a tool step, clicks Expand, and checks that the step body (its Step Config tab) is inside the open dialog and gone from the card. It then closes the dialog and checks that the body is back in the card. The commit adds `data-description`s on the Expand button and the `GModal`, plus `invocations.step_card_expand`, `step_card_modal`, `step_card_modal_close`, `step_card_modal_config_tab` and `step_card_body_config_tab` selectors in `navigation.yml`.

<details><summary>Evidence</summary>

The new test passed locally on both the Playwright and Selenium backends against a Vite dev client built from the review branch.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 1: Inline `style="overflow-x: hidden"` on `FormTool` (implementation verified)

`WorkflowInvocationStep.vue` adds `style="overflow-x: hidden"`. The Bootstrap `overflow-x-hidden` utility class is already used nearby, on the `WorkflowInvocationState` root. Review branch commit `356c3fe3621` switches to the class.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 2: The "view the details here instead" link can't be clicked (implementation verified)

The in-card alert "Click here to view the details here instead." only renders while `stepExpanded` is true, and that is exactly when the `GModal` is open. `GModal` opens with `dialog.showModal()`, which makes the rest of the page inert. So the link sits behind the modal backdrop and can never be clicked. Users can only return the details to the card with the modal's close button, Escape, or a backdrop click.

<details><summary>Evidence</summary>

The first draft of the P2 2 test clicked this link. Playwright reported that the open `dialog[data-description="invocation graph expanded step modal"]` subtree "intercepts pointer events", and the click timed out. The test now closes the dialog with its close button.

</details>

Either drop the link and keep a plain "shown in a modal" message, or remove the alert altogether, since the open modal already makes the state obvious.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered and verified via Claude Opus 5.5 at medium effort while writing the test for P2 2 (verification pass, not a review profile).

</details>

### P3 3: Expand button only for tool steps

`v-if="activeStep.type === 'tool'"` hides "Expand Step" for subworkflow, input and pause steps. The PR description describes the button for active step displays in general. If the restriction is intentional (for example, because those bodies are always small), a one-line confirmation is enough. Subworkflow step bodies can get large too.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort.

</details>

### P3 4: Small cleanups in `InvocationGraph.vue` (implementation verified)

- The comment `// Collapse the step card whenever the active step changes` describes closing the modal (`stepExpanded`), not collapsing the card.
- The Teleport target id `invocation-step-modal-${invocation.id}` assumes only one `InvocationGraph` per invocation is in the DOM. `useUid` (which `GModal` itself uses) removes that assumption at no cost.

Review branch commit `b5afaa8132a` rewords the comment to "Close the expanded-step modal when the active step changes" and builds the target id with `useUid("invocation-step-modal-")`.

<details><summary>Evidence</summary>

The expand/close flow still works with the `useUid` target (live check and the P2 2 test).

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>
