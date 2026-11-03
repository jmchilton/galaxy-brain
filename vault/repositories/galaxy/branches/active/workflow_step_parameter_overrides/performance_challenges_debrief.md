Run via Claude Opus at high effort.

# Performance challenges debrief (round 2): workflow_step_parameter_overrides

I measured the server on an in-process integration Galaxy (SQLite), reusing round 1's temporary harness with an added error-path test. I measured the client with a temporary vitest probe on run data built from real run form responses. Neither probe is committed. All numbers come from them unless marked as reasoning. I didn't use Postgres. Query counts don't depend on the database, but timings do. The client timings are jsdom, which is several times slower than a browser, so compare them with each other, not with a browser.

**One problem found and fixed, in the run form picker.** The picker dialog built every row of the step parameter tree when the run form loaded, although the dialog was closed. Each checkbox click then re-rendered every row. For 50 inner tool steps that was 505 row components mounted on load and 505 re-renders per click. It now builds no rows while closed, and a click re-renders 1 row. A new vitest pins both.

**Round 1's fixes still hold** on the current code (table below). The re-scope's additions add no measurable cost:

- `WorkflowModuleInjector.inject`'s nesting runs only when an exception is raised. Each level wraps `err_data` once, with no queries.
- The client's `err_data` mapping runs once per rejected submission, not on edit. It takes under 1.5 ms on a 3,040-leaf tree.
- Clearing a card's error rebuilds no tree. It re-renders the step parameter list once and that card's form once.

## Changes and SHAs

The bottom five commits didn't change, so the extraction branch `workflow_step_parameter_overrides_api` wasn't re-synced.

| Fix | Folded into | SHA |
|---|---|---|
| `StepParameterPicker`: rows only while open (`v-if="show"`); `toggle` mutates the reactive `Set` in place; new `StepParameterPicker.test.ts` | Picker | `324aa6a72a2` |
| The same `v-if` on the list `div` the workflow view adds (conflict resolution only); the test gets the `view`, `workflowId` and `version` props | Workflow view | `b4123c5a23b` |
| (rebased) | Rerun with this changed | `63818a09456` |
| (rebased) | E2E | `1cdd468d681` |

The baseline, refactor and API commits are unchanged: `58a86dec561`, `b682078c173`, `0919ef03fb4`, `3bfb3a7732c`, `d7952c3ab81`.

## Not acted on

- **The parent rebuilds the tree to map a rejected submission's errors.** `WorkflowRunFormSimple.onSubmissionError` calls `buildStepParameterTree` although `WorkflowRunStepParameters` already holds it. That costs 2.4 ms at 3,040 leaves, once per rejected submission. Moving the mapping into the child would change the component boundary for nothing measurable. `simpleFormDisabledReason` (reruns with overrides) and the expanded form's link list (only with a link) also build their own tree, once per load.
- **The picker filter has no debounce.** Each keystroke refilters and re-renders the matching rows: 40 updates and 65 ms (jsdom) at 300 leaves, 1,270 updates and 640 ms (jsdom) at 3,040 leaves. A browser would be several times faster. Only the 3,040-leaf case, 500 inner tool steps, might lag. Revisit if a real workflow of that size does.
- **Failing fast on an inner error still injects the steps before it.** A bad value on the 50th inner step costs 286 queries, because `dev`'s `populate_module_and_state` injects every earlier step first. A valid 50-override invocation costs 376. That is `dev`'s cost, unchanged by the nesting.
- **Round 1's declines still stand:** making `subworkflow_steps` opt-in, a lighter inner step builder than `Tool.to_json`, and dropping data inputs from inner steps. The run form numbers below haven't moved.

## Tests

- **New vitest** `StepParameterPicker.test.ts`, 2 tests. On the old picker they fail with 3 rows rendered while closed (0 expected), and 4 row re-renders per toggle (1 expected).
- **Vitest**: 40 files, 249 tests, all passing. This covers every test file under `Workflow/Run`, `JobParameters`, `JobInformation`, `WorkflowInvocationState` and `Workflow/Invocation`, plus `Workflow/Editor/Node*`, `Editor/Index`, `useInvocationGraph` and `canvasDraw`.
- **Unit**: `test/unit/workflows/test_step_parameter_overrides.py`, 3 passed. This includes round 1's query-count test.
- **Lint and types**: vue-tsc clean. prettier clean. eslint shows 0 errors and 3 `no-explicit-any` warnings in the new test. No Python changed.
- **E2E**: 12 passed with Playwright, against a rebuilt `static/dist` on a single Galaxy (:8097, now stopped). That is all 11 tests in `test_workflow_run_step_parameter_overrides.py`, plus `test_workflow_rerun.py::TestWorkflowRun::test_workflow_rerun_prefills_expanded_form`.

<details>
<summary>Measurements</summary>

## Round 1's fixes, re-measured

| Surface | Round 1 | Now |
|---|---|---|
| Apply 50 overrides in 5 subworkflows | 30 queries, 33-40 ms | 30 queries, 42 ms |
| Apply 1 override | 5 queries | 5 queries |
| `/invocations/{id}/request`, 1 / 50 overrides | 13 / 17 queries | 13 / 17 queries |
| Run form, 5 uses of 1 stored subworkflow × 10 `sort1` | 10.0 ms inside `_subworkflow_run_steps` | 12.5 ms, 5 outer calls |
| Run form 1×20 `sort1`, branch / without `subworkflow_steps` | 114-116 / 112 queries | 117 / 114 queries |
| Run form 5×10 `sort1` | 289 / 282-287 queries | 289 / 286 queries |
| Run form 4 nested levels × 5 `sort1` | 134-136 / 132-133 queries | 133 / 130 queries |

The prefetch (`_load_tool_step_relationships`) still keeps the apply step at 6 queries per level. The memo in `_subworkflow_run_steps` still builds a shared subworkflow once per request. Payload sizes are byte-identical to round 1's (273,441 and 638,393 bytes).

On the client, `isTopLevelInvocation` still caches per invocation, and `JobStep`'s watcher still has separate primitive sources. Its vitest (1 request where the old code made 5) passes. `useWorkflowRunGraph` and `StepParameterWorkflowView` both call `getFullWorkflowCached(workflowId, model.runData.version)`, so they share one cache key and one download.

## Server error paths (re-scope)

These are `POST /api/workflows/{id}/invocations` calls answered 400, with 5 calls each and the median taken.

| Scenario | Queries | Time | `err_data` |
|---|---|---|---|
| Bad value, top-level step 10 of 10 | 23 | 74 ms | `{"10": {"threshold": …}}` |
| Bad value, inner step 10 of subworkflow 5 (5×10) | 286 | 216 ms | `{"5": {"10": {"threshold": …}}}` |
| Unknown key, same step (override validation) | 11 | 66 ms | `{"5/10/nope": …}` |
| Bad value, 4 levels deep | 114 | 138 ms | 4 nested levels |
| Valid, 4 levels deep (200) | 204 | 190 ms | |
| Valid, 50 overrides in 5×10 (200) | 376 | 250 ms | |

- Override validation (`_invalid`) rejects before any injection, at 11 queries.
- Runtime-state errors fail fast, and the nesting itself is one dict per level on the way out.
- The happy path runs the `try` with no exception, which costs nothing in Python 3.11 or later.

## Client: step parameter tree and error mapping

The probe built run data from saved `sort1` and `echo_step_parameters` inner steps, alternating, and timed the median of 20 runs.

| Run data | Leaves | `buildStepParameterTree` | Map 1 step's errors | Map 200 path errors |
|---|---|---|---|---|
| 5 subworkflows × 10 tools | 300 | 0.6 ms | 0.1 ms | 0.7 ms |
| 20 subworkflows × 25 tools | 3,040 | 2.4 ms | 0.6 ms | 1.4 ms |

`stepParameterKeyLabel` walks one path per error, and `stepParameterErrors` indexes the tree once per call. The server fails fast, so a real rejection carries one step's errors.

## Client: card edits and error clearing

I mounted `WorkflowRunStepParameters` over the 5×10 data with 5 cards, using the real `FormDisplay` and a stubbed picker. I counted `buildStepParameterTree` calls, `update:overrides` emits and component updates.

| Step | Tree builds (total) | Emits (total) | Updates in this step |
|---|---|---|---|
| Mount | 1 | 2 | none |
| Edit a card, no errors | 1 | 3 | the input only |
| Submission errors for 2 cards | 1 | 3 | list 1, 2 card forms |
| Edit an errored card (clears it) | 1 | 4 | list 1, 1 card form |
| Edit it again | 1 | 5 | none |
| Next submission resets errors to `{}` | 1 | 5 | list 1, the other errored card's form |

- `tree` depends only on `props.steps`, and the parent never replaces `model.steps`.
- `overrides` destructures `leaf`, `inputs` and `value`, so it doesn't track `errors`.
- `card.errors = null` on an already clear card doesn't trigger.
- The parent's `stepParameterOverrides` ref isn't read in its template, so the emits re-render nothing.

## Client: the picker (fixed)

GModal is a native `<dialog>` that renders its slot while closed, and `WorkflowRunStepParameters` always renders the picker. So the simple run form mounted a `StepParameterTreeNode` for every node, with a `GTooltip` per locked row and a `GPopover` per help row, on every load.

`toggle` also replaced `selected` with a new `Set`. Every node received a new `selected` prop and re-rendered.

| | 5×10 before | 5×10 after | 20×25 before | 20×25 after |
|---|---|---|---|---|
| Tree nodes mounted while closed | 505 | 0 | 5,100 | 0 |
| Picker mount (jsdom) | 881 ms | 47 ms | 7,076 ms | 34 ms |
| Row re-renders per checkbox click | 505 | 1 | 5,100 | 1 |
| Click to next tick (jsdom) | 165 ms | 8 ms | 1,561 ms | 5 ms |

**Fix.**

- The list renders under `v-if="show"`, alongside the workflow view's existing `v-if="show && view === 'workflow'"`.
- `toggle` adds or deletes in place on the `ref`'s reactive `Set`. Vue tracks `has(key)` per key, so only the clicked row, the `Apply (n)` label (`size`) and the workflow view's counts recompute.
- On open, the picker still sets `selected` to a new `Set` from the cards' keys, so cancelling still discards changes.

The workflow view's counts read the same `Set` through `has`. The E2E tests that check "2 of" and "1 of" after clicks in the workflow view cover that path in a browser.

## Patterns checked and found clean

- **Unbounded queries, Python-side slicing, flush/commit loops, async handlers running sync DB code, recursive SQL**: none added since round 1. No server code changed since round 1's measurements, apart from the nesting.
- **Polling**: `JobStep` still sends one request per invocation. Nothing in the re-scope polls.
- **Expensive fields on shared endpoints**: unchanged from round 1.

</details>
