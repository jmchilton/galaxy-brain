Run via Claude Opus at high effort.

**Recommendation: keep the scope as implemented, and add a small expansion that closes two gaps the issue itself names.** The branch already delivers what #24454, the posted API design and John's direction asked for. That covers the nested `step_parameter_overrides` field, with strict validation and recording, and the tree picker with a pop-out workflow view over one picked set. It also covers subworkflow parameters at any depth, rerun re-show, run links, "Rerun with this changed", and an API series that extracts cleanly onto `dev`. The first addition maps the server's errors onto the matching cards. The issue's spike notes ask for it, and the keys already line up. The second rewords the #24177 legacy-rerun alert, which still says "The simplified form does not support these" although the simple form now does. The issue asks for it to say that the original run didn't record which parameters were chosen. Leave the other candidates the debriefs raise as follow-ups: unlocking conditional selectors and `data_column`, "Rerun with this changed" inside subworkflow invocations, applying links in the expanded form, subworkflow drill-down, and strict legacy `parameters` (G1). The subworkflow-invocation action needs a parent-invocation lookup the API doesn't have. Don't contract either. An API-only or list-only PR would drop the UI the issue exists for, or the graph view John asked for, and the API is already extractable without cutting anything.

Size: 3,377 added lines over 41 files. About 1,810 are production code (543 server, 1,266 client), about 1,570 are tests (605 API and unit, 548 vitest, 413 E2E) and 23 are generated `schema.ts`.

## Possible Decompositions

Constraints that hold for every option:

- **The client commits need the #24177 stack** (#24177 → #24176 → #24178), which isn't opened yet. They use #24177's `simpleFormDisabledReason`, `withRerunValues` and rerun prefill. The API series doesn't need the stack: `workflow_step_parameter_overrides_api` holds it on `origin/dev`, with two dev-only lines (the `param_map.get(step.id)` fix and a `None` guard).
- **The API PR and #24178 conflict in one hunk**, in `services/invocations.py`'s `STEP_PARAMETERS` branch. Taking #24178's side resolves it in either landing order. Once the API PR merges, the full branch drops its API commits on rebase.
- **`/request` of an imported invocation needs #24175**, a sibling of this stack. The API tests document this rather than depend on it.
- **The refactor commit** (`fca8a3145fa`, 18/-15) only sets up API commit 3, so it travels with the API series in every option.

| Commit | Prod / test lines | Needs |
|---|---|---|
| R: Factor the run form's tool step model out | 18 / 0 | `dev` |
| A1: `step_parameter_overrides` on invocation requests | 466 / 564 | `dev` (plus the 2 dev-only lines) |
| A2: `parameters_display` rows carry their path | 23 / 26 | `dev` |
| A3: `subworkflow_steps` in run form data | 36 / 15 | R |
| C1: list picker, cards, route argument, rerun re-show | 853 / 438 | A1, A3, #24177 |
| C2: pop-out workflow view | 305 / 66 | C1 |
| C3: "Rerun with this changed" | 108 / 44 | A2, C1 |
| E: 9 E2E tests | 0 / 413 | all of them |

### Option 1: one PR (as implemented)

1. R, A1–A3, C1–C3 and E, stacked on `issue_24177_rerun_step_params_full_form`.

Reviewers read it commit by commit, and the API commits sit at the bottom. It can't open against `dev` until the stack lands.

### Option 2: API PR plus feature PR

1. **API** (R, A1–A3) against `dev`, about 1,150 lines with half of them tests. It is ready now as `workflow_step_parameter_overrides_api`.
2. **Feature** (C1–C3, E) against #24177, about 2,230 lines. Once the API PR merges, rebase it to drop R and A1–A3.

The API gets server reviewers without waiting on the stack. The client PR still waits for #24177.

### Option 3: API PR, list picker PR, workflow view PR

1. **API** (R, A1–A3), as in option 2.
2. **List picker and rerun** (C1, C3 and the E2E tests that don't use the workflow view): 7 of the 9 tests.
3. **Pop-out workflow view** (C2, with its 2 E2E tests, the `navigation.yml` graph selectors and the fixture `position:` edits from E).

Splitting E means taking its two graph tests and the fixture positions out into PR 3. C2 is the only client commit that touches an editor component (`NodeInvocationText.vue`) and the shared `useWorkflowRunGraph` cache, so it gets reviewers who know the graph code.

### Option 4: vertical slices by user flow

1. **API core** (R, A1, A3) against `dev`: the field and the subworkflow listing.
2. **Picker** (C1, C2 and their E2E tests) against #24177 and PR 1.
3. **"Rerun with this changed"** (A2, C3 and the rerun-with-this-changed E2E test). A2 can go to `dev` on its own, or with C3 on top of PR 2.

This keeps the rerun shortcut, which overlaps with dannon's `step-rerun` work ("rerun this step" plus a job-cache preference, mentioned in the issue thread), in a PR of its own. That can land alongside or be coordinated with his, without holding up the picker. A2 is a standalone, additive `parameters_display` change.

### Option 5: finest split

1. R, A1 (API, `dev`).
2. A2 (API, `dev`).
3. A3 (API, `dev`).
4. C1 (list picker), with its E2E tests.
5. C2 (workflow view), with its E2E tests.
6. C3 (rerun action), with its E2E test.

Each PR is small, but 1–3 have no user-visible effect on their own, and 4–6 each wait on the stack. That means 6 review cycles for one feature.

## Scopes considered

### As implemented

A new nested `step_parameter_overrides` invocation field: strict, recorded in a `meta` row, returned by `/request` and carried through import/export. Alongside it, `parameters_display` paths and recursive `subworkflow_steps`. On the client, the list picker and a pop-out workflow view share one picked set, picked parameters become cards, and run links, rerun re-show and "Rerun with this changed" (top-level jobs) work. Tests: 9 E2E, API and unit tests.

| Pros | Cons |
|---|---|
| <ul><li>It matches the issue, the posted design and John's direction: merged tree plus pop-out graph, and an extractable API.</li><li>Subworkflow parameters work at any depth in both views. The graph spike's lock, which dropped recorded rerun values, is gone.</li><li>The design's semantics are all covered: merge by position, every 400 case, applying on top of `parameters`, and case switching (the deviation fills and records defaults).</li><li>Hardened: every API test fails without the server change, the N+1s are fixed, and two Codex findings are fixed.</li></ul> | <ul><li>3,377 lines, and the client half waits on a stack that isn't opened.</li><li>Server errors land in the generic submission alert, not on their cards.</li><li>The #24177 legacy-rerun alert text is now inaccurate.</li><li>Conditional selectors and `data_column` stay locked, as the issue's first pass specifies.</li><li>"Rerun with this changed" is hidden for jobs inside subworkflow invocations.</li></ul> |

### Expansion: map server errors onto cards (recommended)

Show 400 `err_data` on the card it names, instead of only in the submission alert. Override validation errors are already keyed by the card's slash key (`2/cond/pattern`). Value errors from `populate_module_and_state` come as `{order_index: {"cond|min": msg}}`, which converts to the same key. `stepParameterKeyLabel` can label anything with no card.

| Pros | Cons |
|---|---|
| <ul><li>The issue's spike notes ask for it ("G1 errors should be mapped back to the card"). Phase A, Phase C and the initial debrief all list it as a known gap.</li><li>Client-only, about 30–60 lines plus a test. The keys already match on both sides.</li><li>Value errors (out-of-range ints, regex validators) are the 400s a picker user can actually hit.</li></ul> | <ul><li>Inner subworkflow steps aren't validated at invoke time (their runtime state is computed during scheduling), so their errors still can't map.</li><li>Adds a little state to the card list the thermo-nuclear review just consolidated.</li></ul> |

### Expansion: reword the legacy-rerun alert (recommended)

The `rerunHasStepParameters` alert in `WorkflowRunForm.vue` still reads "The simplified form does not support these, so they would be lost." The issue's Rerun section and lesson 5 in `LESSONS_LEARNED.md` both ask it to say the original run didn't record which parameters were chosen. While there, the `rerunHasUnshownStepParameterOverrides` alert promises the expanded form keeps the values. Codex's review notes that this holds for top-level steps only.

| Pros | Cons |
|---|---|
| <ul><li>An explicit requirement in the issue, and the branch makes the current text false.</li><li>A few lines, plus updating the reason text that `_assert_rerun_expanded` checks.</li></ul> | <ul><li>Touches text that #24177 introduced. It could go into #24177 instead, but the text only becomes false with this branch.</li></ul> |

### Expansion: unlock conditional test parameters in the picker

Let users pick a conditional's selector. The card would then render the newly selected case's parameters. The API already switches cases and fills defaults.

| Pros | Cons |
|---|---|
| <ul><li>The API already supports it, so the client is the only gap.</li><li>Case-switched reruns could stay in the simple form instead of falling back through `rerunHasUnshownStepParameterOverrides`.</li></ul> | <ul><li>The issue excludes it from the first pass.</li><li>A card would become a sub-form that changes shape. That isn't one-input `FormDisplay` cards any more.</li><li>`_default` fills with an empty context. Defaults for dynamic-option selects and `data_column`s in a switched-to case are untested and may be wrong (Phase A review).</li><li>Medium-to-large client work, plus new E2E.</li></ul> |

### Expansion: unlock `data_column` parameters

Enable column pickers once their `data_ref` input is known.

| Pros | Cons |
|---|---|
| <ul><li>The spike and the issue both call column choice the most likely user complaint (Cut, Filter, Sort, Join).</li></ul> | <ul><li>The issue explicitly tracks this as a follow-up.</li><li>The `data_ref` is often an upstream step's output, whose metadata doesn't exist at run time. Only the workflow-input case is solvable, and it needs dataset-metadata-driven options on the client.</li><li>Large, and a design question of its own.</li></ul> |

### Expansion: "Rerun with this changed" inside subworkflow invocations

Offer the job-row action for steps of a subworkflow invocation, building `{"<outer>": {"<inner>": {...}}}` against the parent invocation.

| Pros | Cons |
|---|---|
| <ul><li>The issue says it should work this way ("must build keys against the parent invocation").</li><li>The picker and rerun already handle inner keys, so only the shortcut is missing.</li></ul> | <ul><li>Inner jobs are only viewed on the sub-invocation's own page. The parent view just links to it (`SubworkflowAlert`), and the invocation response has no parent field. This needs a new API field or lookup for the parent invocation and outer step, which belongs in the API series and re-syncs extraction.</li><li>Hiding the action already meets the issue's "not rerun the sub-invocation" half safely.</li></ul> |

### Expansion: make the expanded form apply link overrides

When a link or "Rerun with this changed" lands in the expanded form, apply its values to the form's step models instead of showing the warning the Codex fix added.

| Pros | Cons |
|---|---|
| <ul><li>Links with presets would keep their values in every form.</li></ul> | <ul><li>The job-row link sends `null`, and the expanded form is already seeded with the original values. Only the pointer is lost, and the warning now names each parameter.</li><li>It invests in the legacy form the issue is trying to move away from.</li><li>The expanded form can't render inner subworkflow tool state anyway (a #24177 limitation).</li></ul> |

### Expansion: drill into subworkflow graphs

Let a subworkflow node in the workflow view open its inner graph, with breadcrumbs.

| Pros | Cons |
|---|---|
| <ul><li>It gives large subworkflows a layout, and the spike listed it as an option.</li></ul> | <ul><li>The grouped panel already lists every inner step's parameters, at any depth.</li><li>It needs the inner workflow's editor JSON, but `content_id` is a `Workflow` id while `getWorkflowFull` takes stored ids. It also needs a store scope per level and breadcrumb navigation.</li><li>Pure navigation gain for a lot of client code.</li></ul> |

### Expansion: strict legacy `parameters` (G1)

Return 400 for unknown or inactive keys in `parameters` too, not just in the new field.

| Pros | Cons |
|---|---|
| <ul><li>One validation rule for both fields. Silently ignored typos in API payloads are a real bug class.</li></ul> | <ul><li>The posted design makes it an optional follow-up.</li><li>It changes behaviour for existing API clients and the expanded form. Before it's on by default, the spike's audit still has to cover dynamic options, hidden parameters, `__job_resource` and upgraded-tool saved states.</li><li>Its risk profile is unrelated to this feature, so it belongs in its own PR.</li></ul> |

### Split the API into its own PR

Open R and A1–A3 against `dev` now, from `workflow_step_parameter_overrides_api`, and the client later. This changes how the work lands, not how much of it there is. The options are under Possible Decompositions.

| Pros | Cons |
|---|---|
| <ul><li>The extraction is proven and its tests pass on `dev`. The design asked for it to be extractable.</li><li>The server reviewers' work isn't held up by the unopened stack, and the dev-only `param_map.get(step.id)` fix lands sooner.</li></ul> | <ul><li>An API with no UI for a while, and two review threads.</li><li>A known one-hunk conflict with #24178.</li></ul> |

### Contraction: API only

Ship only the API series. Leave the picker, workflow view and rerun action out of scope.

| Pros | Cons |
|---|---|
| <ul><li>About 1,150 lines, with no dependency on the stack.</li></ul> | <ul><li>The issue exists for the simple-form UI. The modern invocation API could already set these parameters, so an API alone doesn't solve the problem.</li><li>It goes against John's direction.</li></ul> |

### Contraction: API plus the list picker, without the workflow view

Drop C2 (305 production and 66 test lines) and its 2 E2E tests.

| Pros | Cons |
|---|---|
| <ul><li>No editor-component or `useWorkflowRunGraph` changes, and about 400 fewer lines.</li><li>The issue's own spike recommendation called the graph optional.</li></ul> | <ul><li>John asked for the merged tree plus pop-out graph. The design already avoids the graph spike's costs: it shares one picked set, keeps its own store scope and adds no `annotated` prop.</li><li>The graph is where large workflows need help finding a step.</li></ul> |

### Smaller items raised and deferred

| Item | Source | Disposition |
|---|---|---|
| Duplicate unlabeled subworkflows share a card prefix | Phase C review | Tiny. Add the outer step number when names collide. Worth folding into the error-mapping change. |
| Positionless workflows overlap in the graph | Phase C | Affects every read-only `WorkflowGraph`. Its own follow-up. |
| No parameter filter in the workflow view | Phase C | Follow-up. The list view keeps the filter. |
| Graph nodes aren't keyboard-focusable | Phase C review | Needs shared `Node.vue` changes. The panel's step select covers this view. |
| "Rerun with this changed" offered on connected parameters | Phase A review | Degrades to the dropped-key alert. Hiding it needs step connections in `JobParameters`. |
| Legacy `parameters` 400s on a case switch, while overrides fill defaults | Phase A review | Put one line in the PR description. |
| Pure-data `/request` subtraction instead of detached row copies | Phase B, thermo-nuclear reviews | Follow-up once both the API PR and #24178 land. |
| `subworkflow_steps` opt-in, a lighter inner `to_json` | Performance debrief | Measured at about 1 ms per inner step. Revisit only if large run forms are slow. |
| Typing `ConditionalWhen.inputs` at its source | Phase B review | A separate typing PR. |
| `data-description` on `GModal` confirm buttons | E2E polish | Needs a `packages/ui` change. Out of scope. |
| `InvokeWorkflowPayload` silently drops unknown fields | Phase A, spike | Pre-existing. An older server loses the field, and rerun falls back to the expanded form. |
| Child invocations losing inner step parameters on `dev` (the `param_map` bug) | Phase B review | The API PR carries the fix. Say so in its description. |

<details>
<summary>Why the recommendation stops at these two additions</summary>

- **Galaxy reviewers lean towards fixing nearby gaps in touched code.** Both recommended items qualify: they touch files the branch already changes (`WorkflowRunStepParameters.vue`, `WorkflowRunFormSimple.vue`, `WorkflowRunForm.vue`), the issue names both, and both are small and client-only, with no change to the API series and no re-sync of the extraction branch.
- **Each larger candidate is either its own design question or a different PR:**
  - conditional selectors need cards that change shape;
  - `data_column` needs run-time metadata;
  - subworkflow-invocation reruns need a new API field for the parent invocation;
  - G1 on `parameters` changes behaviour for existing API callers.
- **The issue's first pass excludes three of them explicitly:** conditional selectors, `data_column` and adding repeat instances.
- **The branch already went past the issue's first pass.** It lists inner subworkflow trees (G3), keeps subworkflows pickable in the graph view, records filled case-switch defaults, and warns in the expanded form when a link lands there.

</details>
