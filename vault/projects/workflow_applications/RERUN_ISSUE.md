# Expose individual step parameters in the simple workflow run form

Slides: https://jmchilton.net/slides/workflow-step-params/

## Problem

Some users rely on the legacy expanded workflow run form to change tool settings at run time, such as a threshold, a filter value or one option inside a repeat. That form renders every step and every unconnected parameter of the workflow and submits all of them. It is slow to render, and it makes it hard to see what is actually being changed for a run.

The simple run form renders only workflow inputs, so it cannot meet this need. Recent fixes (#24178, #24175, #24176, #24177) would make step parameters round-trip correctly through the invocation API:

- export keys subworkflow step parameters as `<index>|name`;
- import re-keys step parameters;
- rerun prefills from the original run.

But @jmchilton is resisting opening the fixes because they target the legacy workflow run mode. The modern invocation API can already set any of these parameters. What's missing is a lightweight way to set *a few* of them (and not set every parameter and render every form across the whole workflow).

## Proposal

Let the user add specific step parameters to the simple run form as extra inputs, and add or remove them as needed. Only those parameters get sent as step parameter overrides. Everything else uses the workflow's saved values.

### Picking parameters

- The run form offers a tree of the workflow: steps → parameters. Sections, repeat instances, conditionals and subworkflows (with their full inner step trees, nested to any depth) show up as nested nodes.
- **Selectable:** scalar tool parameters (text, integer, float, boolean, select, color).
- **Excluded in the first pass:**
  - **Conditional test (selector) parameters.** Changing them reshapes the step. Only the children of the case currently set are offered. The selector is shown locked, with its value.
  - Data and collection parameters, and connected inputs.
  - Parameters whose options depend on data inputs, e.g. `data_column`. These are shown as disabled with a reason. Column choice (Cut, Filter, Sort, Join) is probably what users most want to change, so track a follow-up that enables a column parameter once its `data_ref` input is set in the simple form.
- **Repeats:** only existing instances are offered. Adding or removing repeat instances is out of scope.
- Workflows with `${...}` replacement parameters in tool steps already use the expanded form (the simple form is disabled for them), so this feature doesn't reach them.
- **Each row** shows the parameter's label and the value the workflow sets ("workflow sets to 0.5"; option labels for selects). It shows a help icon when the parameter has help text. Locked rows (conditional selectors, data-dependent parameters) are grayed out with a lock icon, and hovering the lock explains why. Exposure keys are not shown.
- **Picking is select/deselect.** The picker opens with the currently exposed parameters checked, and applying it sets the whole exposed set, removals included.

### Exposure key

Each exposed parameter is identified by a single string, `<order_index>|<prefixed_name>`. Inside a subworkflow it is `<outer>|<inner>|<prefixed_name>`, with one more index per level of nesting. This matches the step-parameter keys already used by the invocation request export, so run links, rerun and submission all share one scheme. Like `inputs_by: "step_index"`, the step index is the 0-based `order_index`.

### Passing parameters to expose

- The run and rerun entry points accept a repeatable argument listing the exposure keys to show on load, e.g. `step_param=3|cond|threshold`. They also accept an optional preset value for each, e.g. `step_param_value=3|cond|threshold=0.05`.
- When the form opens, keys that can't be resolved are dropped with a warning, and the run is not blocked.
- Landing requests are out of scope for the first pass.

### Recording exposed parameters

The invocation records which step parameters the user explicitly exposed, separately from the full set of step parameters it received. This matters because the expanded form submits every unconnected parameter. Without this record, an invocation with two deliberate overrides looks the same in the export as one with hundreds of unchanged defaults.

- The invoke request accepts the list of exposure keys alongside `parameters`.
- `GET /api/invocations/{id}/request` returns that list, and invocation import/export keeps it. Exposure keys use `order_index`, never database step ids, so import needs no re-keying.

### Rerun

- **Rerun must re-show exposed parameters.** Rerunning an invocation that recorded exposure keys opens the simple form with exactly those parameters shown, prefilled with the original run's values.
- This replaces the #24177 rule that forces the expanded form whenever an invocation has step parameters. Invocations with step parameters but no recorded exposure keys (from the expanded form or the API) keep that behaviour. The #24177 alert ("the simplified form does not support these") should instead say that the original run didn't record which parameters were chosen.
- **Rerun with a change from the invocation:** from an invocation, the user can find a step's parameter and choose **rerun with this changed**. This opens the rerun form with the original inputs, any previously exposed parameters, and that parameter exposed and prefilled with the original run's value.
  - On an invocation whose step parameters weren't recorded, rerun still opens the expanded form, where the extra parameter has no effect. Either offer the action only when the run's step parameters are all recorded (or absent), or carry the parameter into the expanded form.
  - For steps inside a subworkflow, the action must build `<outer>|<inner>|name` keys against the parent invocation, not rerun the sub-invocation.
- For mapped-over steps, the value applies to every job of the step, which is the same as the expanded form today.

### Submission

The form uses the existing request shape, plus the new list of exposed keys. The field name shown below is a placeholder:

```json
POST /api/workflows/{workflow_id}/invocations
{
  "inputs": {...},
  "inputs_by": "step_index",
  "parameters_normalized": true,
  "parameters": {
    "2": {"queries_0|column": "c3"},
    "3": {"1|cond|threshold": 0.05}
  },
  "exposed_step_parameters": ["2|queries_0|column", "3|1|cond|threshold"]
}
```

Like the expanded form, the form sends values as strings (`"0.05"`), so an API run and its UI rerun can record different JSON for the same values.

## API work needed

- **G1. Strict unknown parameter keys (default on).**
  - Inside a tool step's parameter dict, unknown names are silently ignored today. That covers renamed params, keys for an inactive conditional case and repeat indexes that don't exist. The apply path only visits paths present in the current state.
  - With `parameters_normalized`, keys that aren't applied should return a 400. #24178 already does this for unknown step indexes. Apply the same check to tool steps inside subworkflows.
  - Audit existing callers, including payloads from the legacy expanded form, and fix any that send such keys. The spike's audit covered only the tools used by the workflow run and rerun Selenium tests. Still check tools with dynamic options, hidden params, `__job_resource`, and old saved states with keys from upgraded tools.
- **G2. Machine-readable parameter paths for invocation/job parameters.** `/api/jobs/{id}/parameters_display` returns only label, depth and display value. "Rerun with this changed" needs:
  - the prefixed parameter path on each row;
  - an exposable flag;
  - ideally the raw value.

  Either extend that response or add an invocation step-parameters endpoint keyed by the exposure key. Keep the rule for what is exposable in one place (the server), and have it drive the run form's tree as well.
- **G3. List full subworkflow inner parameters.**
  - Today the run data for a subworkflow step lists only the inner runtime-value parameters. It should return the full inner tool parameter trees, recursively for nested subworkflows.
  - Applying non-runtime inner keys already works: `{"<outer>": {"<inner>|name": v}}` reaches the sub-invocation and applies there, one and two levels deep. Add tests to pin this down.
- **G4. Record exposed keys.**
  - Accept the list on invoke, validate each key against `parameters` and store it with the invocation request. A `meta` row in the existing request-parameter table fits, so no migration is needed.
  - Return it from `/request`, and carry it through invocation import/export.
  - The invoke payload silently ignores unknown fields, so a newer client talking to an older server just loses the list: the run works, and rerun falls back to the expanded form.

## Testing

- **API tests:**
  - A simple-style payload carrying `parameters` for nested section, repeat and active-case conditional keys applies them to the job.
  - G1: an unknown or inactive key gets a 400, including inside a subworkflow.
  - G3: an inner subworkflow key, including a nested one, applies.
  - G4: the exposed keys round-trip through `/request` and through import/export.
- **Round trip:** run with exposed overrides → `/request` export → rerun reproduces the same job parameters and the same exposed set.
- **E2E:**
  - Add a parameter in the simple form and run.
  - Rerun and check the parameter is re-shown, prefilled.
  - Do "rerun with this changed" from the invocation.
  - Open a `step_param` link with a preset value.

## Spike

Two throwaway spikes, for reference only. Neither will be opened as a PR. They share the server work, the cards and the payload, and differ only in how parameters are picked.

### Spike 1: tree picker

[`jmchilton/galaxy:workflow_run_exposed_step_params`](https://github.com/jmchilton/galaxy/tree/workflow_run_exposed_step_params), built on top of #24177, implements G1, G2 and G4 and the full UI.

- **UI:** a picker modal with the steps → parameters tree and a filter box. Rows show the workflow's value and help, and locked rows (conditional selectors, data-dependent parameters) are grayed out with a lock and a hover reason. Each picked parameter becomes a card in the simple form, rendered with the tool's own input widget, with the saved or original-run value and a remove button. It also has `step_param` and `step_param_value` route arguments, rerun re-showing the recorded keys, and a "rerun with this changed" action on each scalar row of the invocation's job parameters. The tree and the cards read like the tool form, and they're easy to understand.
- **Server cost:** G1, G2 and G4 are each roughly 20–30 lines with no migration.
- **G3:** applying inner keys already works with no changes. The spike doesn't build the listing.
- **Tests:** 10 API tests, 10 client unit tests and 5 Playwright E2E tests cover every flow above. With G1 on, the existing step-parameter API tests (22) and the workflow run and rerun Selenium tests (41) still pass. About 13 of those 41 submit the expanded form.
- **UX notes:**
  - The tree picker is add-only. Removing happens with × on the card. Select/deselect (as in spike 2) is better.
  - Exposure keys are hidden in the picker, but the filter still matches them, and the alert for dropped link or rerun keys still lists raw keys.
  - A rerun icon on every scalar row is noisy. A hover-only icon, or one "rerun with a changed parameter" button that opens the picker scoped to the step, may read better.
  - Conditionals have no label, so the card breadcrumb should use the test parameter's label.
  - G1 errors should be mapped back to the card. The spike shows them in the generic submission alert.

### Spike 2: graph picker

[`jmchilton/galaxy:workflow_run_exposed_step_params_alt_graph_picker`](https://github.com/jmchilton/galaxy/tree/workflow_run_exposed_step_params_alt_graph_picker), on top of spike 1, replaces the tree modal with the whole workflow rendered as a read-only graph.

- **UI:**
  - Clicking a tool node lists that step's parameters in a side panel, using the same rows as the tree.
  - Each node says how many of its parameters are picked ("2 of 7 parameters picked").
  - Picking is select/deselect, and Apply sets the whole exposed set.
- **Subworkflows are locked.** Subworkflow nodes get a warning header, a lock icon and "Parameters inside subworkflows can't be picked here". Subworkflow keys from a link or a rerun are dropped, with a red alert you can't dismiss saying they **will not be sent**. A matching banner shows in the picker, and the Apply button counts them ("Apply (1) - 1 subworkflow parameter(s) not sent").
- **Client cost:**
  - Editor nodes need a small new prop so tool nodes can show the counts.
  - The picker needs its own workflow store scope, or node clicks move the run form's active step.
  - The datatypes mapper has to be read reactively, or the picker can hang on "Loading workflow".
- **Tests:** 2 Playwright E2E tests (select/deselect and run; a subworkflow link key dropped with a warning), plus client unit tests for the lock and the select/deselect diff.
- **Findings:**
  - **Step numbers are off by one.** The node header says "2: echo" (1-based) while the key says `1|threshold` (0-based `order_index`). With keys hidden from users this is mostly an internal concern. Don't show the two side by side.
  - **The graph only helps find the step.** Once a node is clicked, the panel is the tree's list for that step. Search by parameter name across steps is lost, and large workflows, where the graph helps most, are exactly where that search matters.
  - **Locking subworkflows throws away something that works.** The server already applies inner keys. The bad case is a rerun whose original run set an inner override: the form drops it, and the rerun quietly uses the saved value.

### Comparison

| | Tree picker | Graph picker |
|---|---|---|
| Find a step in a big workflow | By name, or with the filter | By its place in the graph |
| Find a parameter by name across steps | Filter | No |
| Remove exposed parameters | × on the card only | Uncheck in the picker, or × on the card |
| Subworkflow parameters | Runtime ones listed. Full listing needs G3 | Locked. Link and rerun keys are dropped with a warning |
| Rerun of a run with inner subworkflow overrides | Re-shown and re-sent | Dropped, and the saved value is used |
| Client cost | One modal | Modal, its own store scope, a new prop on editor nodes |

**Recommendation:** ship the tree picker, with select/deselect taken from the graph spike. The graph could later be an optional "show in graph" view on top of the tree, reusing the run form's existing graph panel, but not the only way to pick. If a graph-only mode ever ships, keep subworkflow keys as read-only cards that are still sent, rather than dropping them.

Related: #24178, #24175, #24176, #24177.
