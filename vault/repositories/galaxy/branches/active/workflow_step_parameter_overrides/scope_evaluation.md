Run via Claude Opus at high effort.

**Recommendation: keep the scope as implemented. No further expansion or contraction this round.** Round 1's modest expansion is in: server errors now land on their cards, inner subworkflow errors nest under their subworkflow step, and the #24177 legacy-rerun alert says the original run didn't record which parameters were chosen. With those, the branch covers everything #24454's first pass and the posted `step_parameter_overrides` design ask for. That includes the nested, strict, recorded field; the tree picker with the pop-out workflow view; subworkflow parameters at any depth; run links; rerun re-show; and "Rerun with this changed". None of the items still open makes the branch materially incomplete. Four of the five new ones predate the branch or sit in code it shares with every Galaxy form: the case switch into a `min >= 1` repeat, the expanded form's silent inner-step errors, `FormError` accessibility and the `navigates_galaxy.py` fix. The fifth, the picker filter debounce, was measured and only matters past about 500 inner tool steps. The rest are round 1's deliberate first-pass exclusions. The strongest candidate to ride along is the two-line expanded-form alert for inner-step errors. If John wants it, it fits a small revision during his read-through and needs no re-scope.

Size: 3,691 added lines over 48 files. 1,961 are production code (555 server, 1,406 client), 1,707 are tests (API, unit, vitest, E2E, the test tool and fixtures, selectors) and 23 are generated `schema.ts`.

## Possible Decompositions

These constraints hold for every option:

- **The client commits need the #24177 stack** (#24177 → #24176 → #24178 → `dev`). None of it is open as a PR yet. The picker uses #24177's `simpleFormDisabledReason`, rerun prefill and `WorkflowRunForm.vue` alerts, and it rewords one of those alerts (#24177's `test_workflow_rerun.py` assertion moves with it).
- **The API series doesn't need the stack.** `workflow_step_parameter_overrides_api` holds the bottom five commits on `origin/dev` `38dc259318c`, plus two dev-only lines (the `param_map.get(step.id)` fix and a `None` check). It conflicts with #24178 in one `services/invocations.py` hunk, and taking #24178's side resolves it in either order.
- **The baseline and refactor commits travel with API 1.** The baseline pins the legacy `err_data` shape that API 1 flips. The refactor only prepares API 3.
- **The E2E commit mixes four things:** tests for every client commit, graph positions for two fixtures (used only by the workflow-view tests), `navigation.yml` selectors, and the 3-line `workflow_run_ensure_expanded` fix. `test_link_in_expanded_form_lists_its_parameters` calls that helper twice, so the fix has to land before or with that test.

| Commit | Prod / test lines | Needs |
|---|---|---|
| B: baseline tests (legacy `err_data` shape) | 0 / 14 | `dev` |
| R: factor `_tool_step_run_model` | 18 / 0 | `dev` |
| A1: `step_parameter_overrides`, inner `err_data` nesting | 478 / 628 (+18 generated) | `dev` plus the 2 dev-only lines |
| A2: `parameters_display` rows carry `path` | 23 / 26 (+5 generated) | `dev` |
| A3: `subworkflow_steps` in run form data | 36 / 14 | R |
| C1: picker, cards, errors on cards, link argument, rerun re-show | 1,012 / 427 | A1, A3, #24177 |
| C2: pop-out workflow view | 305 / 74 | C1 |
| C3: "Rerun with this changed" | 108 / 50 | A2, C1 |
| E: 11 E2E tests, selectors, fixture positions, helper fix | 0 / 479 | all of them |

### Option 1: one PR (as implemented)

1. B, R, A1–A3, C1–C3 and E, stacked on `issue_24177_rerun_step_params_full_form`.

Reviewers read it commit by commit with the API at the bottom. It can't target `dev` until the stack lands, and at 3,691 lines it is one long review.

### Option 2: API PR, then the feature PR

1. **API** (B, R, A1–A3) against `dev`: about 1,260 lines, more than half of them tests. It is ready now as `workflow_step_parameter_overrides_api`.
2. **Feature** (C1–C3, E) against #24177: about 2,450 lines. Rebase it to drop the API commits once PR 1 merges.

Server reviewers start without waiting for the stack. The UI still waits on #24177.

### Option 3: API, list picker with rerun, workflow view

1. **API** (B, R, A1–A3), as in option 2.
2. **List picker and rerun** (C1, C3, and E without its workflow-view tests and fixture positions).
3. **Pop-out workflow view** (C2, its two E2E tests, the graph selectors and the fixture positions).

C2 is the only commit touching an editor component (`NodeInvocationText.vue`) and the shared `useWorkflowRunGraph` cache, so PR 3 gets reviewers who know the graph code. Splitting E is mechanical but has to be done by hand.

### Option 4: vertical slices by user flow

1. **API core** (B, R, A1, A3) against `dev`.
2. **Picker** (C1, C2 and their E2E tests) against #24177 and PR 1.
3. **"Rerun with this changed"** (A2, C3, its E2E test). A2 can also go to `dev` alone, since it's a small additive `parameters_display` change.

PR 3 overlaps dannon's `step-rerun` branch ("rerun this step" with a job-cache preference, from the issue thread). Keeping it separate lets the two be coordinated without holding up the picker.

### Option 5: satellite fixes first, then option 2

1. **Baseline tests** (B) against `dev`. They use only `dev` fixtures and pin today's legacy `err_data` for a bad inner value. On its own it's a test-only PR, and its value is mostly as a record of the shape change that API 1 then makes.
2. **`workflow_run_ensure_expanded` fix** against `dev`. It's 3 lines, but no `dev` test calls the helper twice in one session, so it would land untested. It must merge before PR 4.
3. **API** (R, A1–A3) against `dev`.
4. **Feature** (C1–C3, E) against #24177.

This takes the two changes that aren't about overrides out of the feature review. The cost is two more review cycles for 17 lines.

### Option 6: finest split

1. B and R with A1 (API, `dev`).
2. A2 (API, `dev`).
3. A3 (API, `dev`).
4. C1 with its E2E tests.
5. C2 with its E2E tests.
6. C3 with its E2E test.

Each PR is small, but 1–3 have no visible effect alone, and 4–6 all wait on the stack. That's six review cycles for one feature.

## Scopes considered

### As implemented (recommended)

The branch adds a nested `step_parameter_overrides` invocation field. It's strict, recorded in a `meta` row, returned by `/request` and carried through import/export. `parameters_display` rows get their `path`, run form data lists `subworkflow_steps` recursively, and inner-step `err_data` nests per subworkflow. On the client, the list picker and the pop-out workflow view share one picked set, picked parameters become cards that show their own server errors, and run links, rerun re-show and "Rerun with this changed" (top-level jobs) work. The legacy-rerun alert is reworded.

| Pros | Cons |
|---|---|
| <ul><li>It covers the issue's first pass, the posted API design and John's merged tree plus pop-out graph direction.</li><li>It delivers both of round 1's recommended additions, and the error mapping fixed a real index collision for inner errors along the way.</li><li>It's been through round 2 hardening: every new API test fails without the server change, the picker no longer mounts 505 rows while closed, and Codex round 2's one finding was refuted.</li><li>The API series is still extractable onto `dev`.</li></ul> | <ul><li>3,691 lines, and the client half waits on an unopened stack.</li><li>API 1 changes the legacy `err_data` shape for inner-step errors (pinned by the baseline commit; goes in the PR description).</li><li>The first-pass exclusions remain: conditional selectors, `data_column`, and the action inside subworkflow invocations.</li><li>The items below remain open, all follow-ups.</li></ul> |

### Expansion: alert for inner-step errors in the expanded form (new)

`WorkflowRunForm.vue` takes the first `err_data` entry as `[stepId, [name, message]]` and emits no `submissionError` once that parses. Since API 1 nests inner errors, the message is an object and matches no input, so the user sees nothing. The fix is to emit the alert when the message isn't a string.

| Pros | Cons |
|---|---|
| <ul><li>About two lines, in a file the picker commit already touches.</li><li>The branch changes the shape this code reads, so a reviewer may ask about it.</li><li>The cheapest open item that a user can actually hit.</li></ul> | <ul><li>It predates the branch. Before, inner errors either matched nothing or highlighted the wrong top-level input, so the branch removed a wrong highlight and made nothing worse.</li><li>It's the legacy form the issue is moving users away from.</li><li>It needs an E2E or vitest case of its own, and the test challenges just put `WorkflowRunForm.test.ts` back to its base version.</li></ul> |

<details>
<summary>Why it isn't a scope change</summary>

The branch is complete without it, since the simple form is where overrides live and that path now shows every error. If John wants it, it's a revision-sized change to the picker commit, through the workhorse "Changes" path, rather than a re-scope. Otherwise it's a two-line follow-up against #24177 or `dev`, once API 1 lands.

</details>

### Expansion: a case switch into a case with a `min >= 1` repeat (new)

If an override (or legacy `parameters`) switches a conditional into a case with a `min >= 1` repeat, the job runs with zero instances. Scheduling's `visit_input_values` never creates `Repeat.default` instances for a missing repeat. Fixing it means either teaching scheduling to create the new case's default instances or rejecting such switches with a 400.

| Pros | Cons |
|---|---|
| <ul><li>The branch documents that a switched-to case "starts with its defaults", and that isn't true for repeats.</li><li>Rejecting the switch in the walker would be small and would make the new field's semantics honest.</li></ul> | <ul><li>It predates the branch: legacy `parameters` hit the same scheduler path.</li><li>The picker locks conditional selectors, so only API callers can reach it.</li><li>Creating default instances changes shared tool-state code under every workflow run. Rejecting is a design call against the posted semantics ("to switch a conditional's case, include its test parameter").</li><li>Either fix lands in API 1 and re-syncs the extraction branch.</li></ul> |

<details>
<summary>Disposition</summary>

This belongs in the PR's known gaps, next to the existing "a switched-to case ... might fill a wrong default". The scheduler fix is its own `dev` bug, with legacy-path tests. If a reviewer prefers the 400, it's a small change to the walker.

</details>

### Expansion: tie card errors to their inputs for screen readers (new)

`FormError.vue` renders a plain `<span>` with no `role` or `aria-describedby` link to its input.

| Pros | Cons |
|---|---|
| <ul><li>Card errors would be announced with the field they belong to.</li></ul> | <ul><li>This holds for every Galaxy form error, tool forms included. The fix is in shared `FormError`/`FormElement` code and needs its own review.</li><li>The simple form's submission alert is a `danger` `GAlert`, which is announced right away and points at the marked cards.</li></ul> |

### Expansion: debounce the picker filter (new)

Each keystroke refilters and re-renders matching rows.

| Pros | Cons |
|---|---|
| <ul><li>A few lines.</li></ul> | <ul><li>Measured at 65 ms (jsdom) per filter pass at 300 leaves, and 640 ms at 3,040 leaves. A browser is several times faster, so only workflows with about 500 inner tool steps might lag.</li><li>A debounce adds timing to the E2E filter assertions.</li><li>The performance pass deliberately left it for a real workflow that shows lag.</li></ul> |

### Expansion: make the "can't show" rerun alert exact for inner steps

The `rerunHasUnshownStepParameterOverrides` alert implies that the expanded form keeps the values. That holds for top-level steps only, because the expanded form can't render inner subworkflow tool state (a #24177 limitation).

| Pros | Cons |
|---|---|
| <ul><li>Small, client-only, in a file the branch adds to.</li></ul> | <ul><li>It's reachable only from an API-made run that switched an inner conditional's case, since the picker can't record one.</li><li>The real fix is the expanded form rendering inner state, which belongs to the #24177 stack.</li><li>The re-scope and its review both deferred it.</li></ul> |

### Expansion: scroll to the first card with an error

| Pros | Cons |
|---|---|
| <ul><li>`FormDisplay`'s `validationScrollTo` already exists.</li></ul> | <ul><li>The alert already says "Fix the step parameters marked below", and the cards sit just under it.</li><li>The server fails fast, so a rejection usually names one step.</li></ul> |

### Carried from round 1: unlock conditional test parameters

The card would render the selected case's parameters. The API already switches cases and fills defaults.

| Pros | Cons |
|---|---|
| <ul><li>The client is the only gap.</li><li>Case-switched reruns could stay in the simple form.</li></ul> | <ul><li>The issue excludes it from the first pass.</li><li>Cards would become sub-forms that change shape.</li><li>Defaults in a switched-to case are untested for dynamic selects and `data_column`, and they're wrong for `min >= 1` repeats (above).</li></ul> |

### Carried from round 1: unlock `data_column` parameters

| Pros | Cons |
|---|---|
| <ul><li>Column choice is what users most likely want to change.</li></ul> | <ul><li>The issue tracks it as an explicit follow-up.</li><li>It's only solvable when the `data_ref` is a workflow input, and even then it needs metadata-driven options on the client.</li></ul> |

### Carried from round 1: "Rerun with this changed" inside subworkflow invocations

| Pros | Cons |
|---|---|
| <ul><li>The issue describes it.</li><li>The picker and rerun already handle inner keys.</li></ul> | <ul><li>It needs a parent-invocation lookup the API lacks, so it means new API work and an extraction re-sync.</li><li>Hiding the action already satisfies the issue's "not rerun the sub-invocation".</li></ul> |

### Carried from round 1: the expanded form applying link overrides

| Pros | Cons |
|---|---|
| <ul><li>Presets would survive in either form.</li></ul> | <ul><li>The expanded form already lists each linked parameter it can't preset, and the job-row link sends `null` anyway.</li><li>It's an investment in the legacy form, which can't render inner state.</li></ul> |

### Carried from round 1: drill into subworkflow graphs

| Pros | Cons |
|---|---|
| <ul><li>It gives large subworkflows a layout.</li></ul> | <ul><li>The grouped panel already lists inner steps at any depth.</li><li>It needs per-level store scopes and a stored-id lookup for inner workflows. That's a lot of client code for navigation alone.</li></ul> |

### Carried from round 1: strict legacy `parameters` (G1)

| Pros | Cons |
|---|---|
| <ul><li>One validation rule for both fields.</li></ul> | <ul><li>The posted design makes it an optional follow-up.</li><li>It changes behaviour for existing API callers and the expanded form, and it needs an audit first.</li></ul> |

### Contraction: API only

| Pros | Cons |
|---|---|
| <ul><li>About 1,260 lines, with no stack dependency.</li></ul> | <ul><li>The issue exists for the simple-form UI. The API could already set these parameters.</li><li>It goes against John's direction.</li></ul> |

### Contraction: drop the pop-out workflow view

| Pros | Cons |
|---|---|
| <ul><li>About 380 fewer lines, and no editor-component or `useWorkflowRunGraph` changes.</li></ul> | <ul><li>John asked for the merged tree plus pop-out graph.</li><li>It shares one picked set and its own store scope, so it avoids the graph spike's costs.</li></ul> |

### Smaller items raised and deferred

| Item | Source | Disposition |
|---|---|---|
| `navigates_galaxy.py` helper fix could go to `dev` on its own | Baseline refactor, round 2 | Option 5 above. It lands untested alone. |
| The parent rebuilds the tree to map a rejection's errors (four builders in all) | Performance, thermo-nuclear round 2 | 2.4 ms at 3,040 leaves, once per rejection. The ownership refactor broke #24177's tests and was reverted. |
| Failing fast on an inner error still injects the earlier steps | Performance round 2 | That cost is `dev`'s `populate_module_and_state`, unchanged by the branch. |
| Errors on later steps appear one step at a time | Re-scope implementation | `populate_module_and_state` raises at the first bad step. It's pre-existing. |
| Duplicate unlabeled subworkflows share a card prefix | Phase C, re-scope | Affects only how the alert reads, since the mapping uses keys. |
| `stepParameterOverrideKeys` helper | Thermo-nuclear round 2 | It would be a one-line wrapper. |
| `data-description` on `GModal` confirm buttons | E2E polish, both rounds | Needs a `packages/ui` change. |
| Positionless workflows overlap in the graph; no filter in the workflow view; graph nodes not keyboard-focusable | Phase C | Shared `WorkflowGraph`/`Node.vue` follow-ups. The list view keeps the filter and the panel's step select covers keyboard use. |
| "Rerun with this changed" offered on connected parameters | Phase A | Degrades to the dropped-key alert. |
| Pure-data `/request` subtraction; `subworkflow_steps` opt-in; typing `ConditionalWhen.inputs` | Phase B, performance, thermo-nuclear | Unchanged from round 1. |
| `InvokeWorkflowPayload` silently drops unknown fields | Phase A | Pre-existing. An older server loses the field and rerun falls back to the expanded form. |
| dannon's `step-rerun` and its job-cache preference | Issue thread | Coordination, not scope. It composes with the field as the posted design says. |

<details>
<summary>Why keep the scope this round</summary>

- **This round's bar is different.** Round 1 followed the default lean towards a modest expansion and delivered it. A scope change now would park the branch, with no further re-scope possible, so it should be recommended only if the branch is materially incomplete. It isn't.
- **The new items are either pre-existing or in shared code.** The `min >= 1` repeat sits in the scheduler under both fields. The expanded form never showed inner errors. `FormError` accessibility affects every Galaxy form. The `navigates_galaxy.py` fix is a packaging choice, not missing work.
- **The one cheap, reachable item fits a revision.** The expanded-form alert is about two lines in a file the branch already touches. John can fold it in during his read-through without changing the scope.
- **The larger items are still their own design questions.** Shape-changing cards, run-time column metadata, a parent-invocation lookup and stricter legacy validation are each outside the issue's first pass, and nothing since round 1 changed that.

</details>
