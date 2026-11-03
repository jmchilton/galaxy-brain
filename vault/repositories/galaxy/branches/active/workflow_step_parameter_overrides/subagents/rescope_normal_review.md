Run via Claude Opus at high effort.

I reviewed the re-scope (`workflow_step_parameter_overrides_alt_original_scope` `20c7b0feaea` against the branch) and acted on two findings. A new "Baseline tests" commit at the bottom of both branches pins the `err_data` that legacy `parameters` callers get for a bad value inside a subworkflow. API commit 1 then flips that assertion, so the one behaviour change the re-scope makes for existing callers now shows up in a test diff. I also fixed a code comment in `simpleFormDisabledReason.ts` that the reworded alert had made false. Everything else the review raised is either pre-existing shared-component behaviour or a follow-up. Nothing was pushed, and nothing is security-sensitive.

## Changes

| Branch | Commits, bottom to top |
|---|---|
| `workflow_step_parameter_overrides` over `46db8f9d5b6` | `58a86dec561` (**new**, Baseline tests), `b682078c173` (refactor), `132ff25be5e` (API 1), `32702c6dab0` (API 2), `da16baafe4f` (API 3), `138abce985e` (picker), `dc166d5a6d3` (workflow view), `477f1bd83bc` (rerun with this changed), `67eb5868447` (E2E) |
| `workflow_step_parameter_overrides_api` over `38dc259318c` | `4be8a87cb79` (**new**, Baseline tests), `84bb4eb06ab` (refactor), `d45ec652789` (API 1), `4329db1ca4d` (API 2), `5782c3b2042` (API 3) |

- **Baseline tests** (`58a86dec561`, cherry-picked unchanged as `4be8a87cb79`): `test_workflows.py::test_run_subworkflow_runtime_parameters_invalid_value`. It sends legacy `parameters` `{"1": {"1|num_lines": "many"}}` to `WORKFLOW_NESTED_RUNTIME_PARAMETER` and pins the old shape, `err_data == {"1": {"num_lines": ...}}`. It passed on `46db8f9d5b6` before the change. It uses only fixtures and tools that `dev` has, so it can go out as a PR of its own.
- **API 1** (`132ff25be5e` / `d45ec652789`): the same test now expects `{"1": {"1": {"num_lines": ...}}}`. The commit message already described the change.
- **Picker** (`138abce985e`): the comment above the `rerunHasStepParameters` check said "The simple form never submits tool step parameters". It now reads "Legacy step parameters don't record which parameters were chosen, so the simple form can't re-show them", to match the alert.

The extraction branch was re-synced. I cherry-picked the baseline onto `38dc259318c`, rebased the four API commits onto it (no conflicts), then squashed in the test change. Its tree differs from the old `60bb11d66cb` only by the new test. `git range-diff` against the main branch's API series shows commit 1 still differing only by the two dev-only lines, their message paragraph and stack context.

## Not acted on

- **The expanded form drops inner-step errors without showing anything.** `WorkflowRunForm.vue` takes the first `err_data` entry as `[stepId, [name, message]]` and doesn't emit `submissionError` when that parse succeeds. Before this change, an inner error either matched no input on the subworkflow step (when the indexes collided) or highlighted the wrong top-level input. Now it always matches nothing. Either way the user sees no message, so this predates the branch, and the change at least removes the wrong highlight. A two-line follow-up would emit the alert when the message isn't a string. I left it out because the scope evaluation says not to invest in the legacy form.
- **Card errors aren't tied to their field for assistive technology.** `FormError.vue` renders a plain `<span>`, with no `role` and no `aria-describedby` link to the input. This is true of every Galaxy form error, and fixing it means changing a shared component. The simple form's submission alert is a `danger` `GAlert`, which is announced right away, and it tells the user to "Fix the step parameters marked below".
- **The form doesn't scroll to the first card with an error.** The alert points the user to the marked cards. `FormDisplay`'s `validationScrollTo` could do the scrolling later.
- **Alternative `err_data` shape.** Inner errors could instead be flattened to `{outer: {"inner|name": msg}}`, which is the form legacy `parameters` uses for input. I kept the nested shape. It mirrors the internal parameter map and `step_parameter_overrides`, it extends to any depth, and inner upgrade-message errors nest the same way.
- **The `rerunHasUnshownStepParameterOverrides` wording**, which holds for top-level steps only. The re-scope debrief already deferred this.
- **No E2E rerun.** The only client change in this pass is a code comment, so `static/dist` would build to the same behaviour, and the re-scope's 10/10 E2E run still applies.

## For the PR description

- API 1 changes `err_data` for legacy `parameters` callers. A bad value inside a subworkflow is now nested under the subworkflow step's index, where before it was keyed by the inner step's index alone. Nothing in the client or in Galaxy's tests read the old shape. The only reader is the expanded form, and it never showed these errors.
- The picker commit rewords #24177's `rerunHasStepParameters` alert in `WorkflowRunForm.vue`, and updates #24177's `test_workflow_rerun.py::test_workflow_rerun_prefills_expanded_form` assertion to match. This branch is the right place for that change, because the old text only becomes false once the picker exists. Expect a one-line conflict in that test if #24177 changes it first.

## Tests

- **API, extraction branch** (`5782c3b2042`): 61 passed. That is `test_workflow_step_parameter_overrides.py` plus the `test_workflows.py` tests matching `subworkflow` (60 before, plus the baseline).
- **API, main branch** (`67eb5868447`): 70 passed. That is `test_workflow_step_parameter_overrides.py` plus the `test_workflows.py` tests matching `subworkflow` or `step_parameter` (69 before, plus the baseline).
- **Baseline on `46db8f9d5b6`**: 1 passed.
- **vitest**, over the brief's suites: 40 files and 259 tests passed.
- **vue-tsc**: clean.
- **eslint and prettier**: clean on the changed file.
- **black, ruff and isort**: clean on `test_workflows.py`.

<details>
<summary>Full review</summary>

### 1. `WorkflowModuleInjector.inject` nesting inner errors (API commit 1)

- **Correct, and consistent with the rest of the API.** Each subworkflow level catches the `MessageException` from its inner `populate_module_and_state` and wraps `err_data` once under `step.order_index`. Two levels give `{outer: {mid: {inner: {...}}}}`, and the API test checks that. The keys are `order_index`, as at the top level and in `step_parameter_overrides`.
- **The exception keeps its identity.** It mutates `extra_error_info` in place and re-raises, so its type, message and status code are unchanged. `ToolMissingException` and other errors without `err_data` pass through untouched, and `run_form` and `managers/workflows.py` catch it the same way they did before.
- **Other paths reach it.** Run-form building (`inject_all` with `ignore_tool_missing_exception=True`) and scheduling (`WorkflowInvoker`'s `inject_all`) both reach the nested call.
  - Run-form building surfaces only `err_msg`. `WorkflowRun.vue` matches on the "Workflow step has upgrade messages" text, not on `err_data`.
  - Scheduling turns a `MessageException` into `InvocationUnexpectedFailure(details=str(e))`, and `str()` is `err_msg`.
  - So neither path depends on the shape.
- **Readers of the shape in the codebase.**
  - In the client, `WorkflowRunForm.vue` is the only reader of `err_data` from invocation. See "Not acted on" above.
  - `ToolForm.vue` and `submitAsync.ts` read tool `err_data`, which this change doesn't touch.
  - On the server, `managers/jobs.py` copies tool `err_data` into job state messages, also unrelated.
  - No API or unit test asserted `err_data` for invocations before this branch.
- **Baseline rule.** The old shape had no coverage, and the new tests use the new field, so the rule didn't strictly require a baseline. But commit 1 changed what existing `parameters` callers get, and no test showed it. A baseline that commit 1 then flips makes the change reviewable and keeps a legacy-path test. I added one.

### 2. `stepParameterErrors.ts` and the card error UX

- **Reuse.**
  - Errors go through `FormDisplay`'s existing `errors` prop to `FormError`, the same as tool form errors.
  - Labels come from `stepParameterKeyLabel`, and card keys from the tree's ids.
  - `nodesById` is a small local index. `resolveStepParameterKeys` builds one over leaves only, and this one needs interior nodes (repeat and subworkflow kinds) as well, so a separate index is justified.
- **Clarity.** The two functions are pure and well split: parsing `err_data` against the tree, then splitting card errors from the alert. Both `err_data` shapes are documented in one docstring. The punctuation handling at the end of `stepParameterSubmissionErrors` is a little fiddly, but it is tested.
- **Stale errors.**
  - The parent resets its errors at the start of every submission.
  - Each card clears its own error and border on change, and `FormDisplay` also resets its errors when its data changes.
  - Cards created after a rejection start with no error.
  - The parent's map can still hold a key for a card that was removed, which is harmless.
- **Accessibility.** The submission alert is announced (`danger` → assertive). The per-card message isn't tied to its input. That is the shared `FormError` / `FormElement` behaviour, so it was not fixed here.
- **Minor.** `onSubmissionError(error: any)` matches `errorMessageAsString`'s own typing. The tree is rebuilt only on error. Neither is worth a change.

### 3. Parent-stack files

- Rewording `WorkflowRunForm.vue` in the picker commit is right. The text only becomes false with the picker, and #24177 on its own still can't show these values in the simple form.
- The `test_workflow_rerun.py` assertion moves with it, so the commit stays self-consistent.
- The new alert text matches the issue's requested wording.
- The comment next to the check in `simpleFormDisabledReason.ts` (#24177's line) still described the old reason. It is fixed in the same commit.

### 4. The `advanced/label` expression validator

- `echo_step_parameters.xml` is new in API commit 1. Only this branch's tests use it: `test_workflow_step_parameter_overrides.py`, `test_jobs.py::test_parameters_display_override_paths`, the fixtures in `workflow_fixtures.py` and the E2E file.
- Every fixture and test value is lowercase except the deliberate "Tuned" cases.
- The tool has no `<tests>`, so the framework tool tests don't run it.
- Galaxy's linter reports no validator issue. It gives only the usual TestsMissing and CitationsMissing warnings.
- The default `run` passes the validator, so building the run form isn't affected. The client doesn't evaluate `expression` validators, which is what lets the E2E test reach the server.

</details>
