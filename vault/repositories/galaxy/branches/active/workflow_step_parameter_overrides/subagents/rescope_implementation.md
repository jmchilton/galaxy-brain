Run via Claude Opus at high effort.

Both items of the scope evaluation's modest expansion are in. Server errors now show on the override card they name, and the #24177 legacy-rerun alert now says the original run didn't record which parameters were chosen. The error mapping needed one server change. Inner subworkflow steps *are* validated when the request is submitted, but their errors came back keyed by the inner step's index alone, which can collide with an outer step. API commit 1 now nests them under the subworkflow step, and the extraction branch was re-synced. Nothing was pushed, and nothing is security-sensitive.

## Commits

| Branch | Commits, bottom to top |
|---|---|
| `workflow_step_parameter_overrides` over `46db8f9d5b6` | `fca8a3145fa` (refactor, unchanged), `af64fbcae75` (API 1), `d366bc857dc` (API 2), `8ba6902ed88` (API 3), `58c56b5559d` (picker), `0a0f6f93f72` (workflow view), `5101c9a4648` (rerun with this changed), `933080aa230` (E2E) |
| `workflow_step_parameter_overrides_api` over `38dc259318c` | `aa46cdf054e` (refactor, unchanged), `c3a5ff0cf68`, `0974ed38b95`, `60bb11d66cb` |

API 2, API 3, the workflow view and the rerun commit changed only in SHA. Before the message rewording the branch head was `65484a5151d`, and the final tree is identical to it.

- **API 1** (`af64fbcae75`):
  - `WorkflowModuleInjector.inject` catches the `MessageException` from a subworkflow's inner `populate_module_and_state` and nests its `err_data` under the subworkflow step's `order_index`. The result is `{outer: {inner: {"a|b": msg}}}`, nested once per level, like the overrides themselves.
  - `echo_step_parameters`'s `advanced/label` gets an `expression` validator ("Run labels are lowercase"). The client doesn't evaluate `expression` validators (it handles only `regex`, `length` and `in_range`), so this gives the tests a value error that only the server reports.
  - API tests pin both shapes. At the top level the error is keyed by step, then by flat name (`threshold`, `advanced|label`). Two subworkflows deep it is `err_data["1"]["1"]["1"]`.
  - Commit message: one new paragraph.
- **Picker** (`58c56b5559d`):
  - New `stepParameterErrors.ts` with two pure helpers. `stepParameterErrors(tree, errData)` reads either `err_data` shape into `{key, label, message}` entries. `stepParameterSubmissionErrors(tree, shownKeys, errData, errMsg)` splits those entries into errors for cards and a message for the submission alert.
  - `WorkflowRunFormSimple` maps a rejected submission's `err_data`. It passes the card errors to `WorkflowRunStepParameters` as an `errors` prop and emits the alert message.
  - Each card keeps its own `errors` object, hands it to its `FormDisplay`'s `errors` prop, and gets a red border. Editing the card clears its error.
  - The `rerunHasStepParameters` alert is reworded.
  - The commit message gets a paragraph for each change.
- **E2E** (`933080aa230`): adds `test_server_errors_land_on_their_cards` and a `card_error` selector. The legacy-rerun reason assertion is updated.

### The alert text was in the parent stack's file

The `rerunHasStepParameters` text lives in `WorkflowRunForm.vue`, which #24177 introduced. I changed it in this branch's picker commit, because that commit is what makes the old text false. It now reads: "The original run didn't record which tool step parameters were chosen, so the full form is shown."

#24177's own Selenium test, `test_workflow_rerun.py::test_workflow_rerun_prefills_expanded_form`, asserted the old text. I updated it in the same picker commit so the commit stays self-consistent. When this branch is rebased onto a future #24177, expect a one-line conflict in that test if #24177 changes it. No vitest checked the text.

## What the server returns

I probed a Galaxy started from this worktree with `WORKFLOW_STEP_PARAMETER_OVERRIDES` and its `_NESTED` variant.

| Request | Before | After the API 1 change |
|---|---|---|
| Override validation, top level (`{"2": {"thresold": 1}}`) | `err_msg` "Invalid step_parameter_overrides entry '2/thresold': ...", `err_data` `{"2/thresold": "unknown parameter"}` | unchanged |
| Override validation, one subworkflow deep | `{"1/1/thresold": "..."}`, `{"1/1/cond/pattern": "not in the active case ..."}` | unchanged |
| Value error, top level (`threshold: "high"`, `mode: "nope"`, `cond.min: "abc"`, label "Tuned") | `err_msg` "Error computing workflow step runtime state", `err_data` `{"2": {"threshold": ..., "mode": ..., "cond\|min": ...}}` | unchanged |
| Value error, one subworkflow deep (`{"1": {"1": {"threshold": "high"}}}`) | 400 at submit, `{"1": {"threshold": ...}}`, keyed by the **inner** step's index only | `{"1": {"1": {"threshold": ...}}}` |
| Legacy `parameters` value error | `{"2": {"threshold": ...}}` | unchanged at the top level. Inner steps nest the same way. |

- **Inner steps are validated at submit, not only during scheduling.** `inject` runs `populate_module_and_state` on each subworkflow with its slice of the parameter map, and that raises for any inner step's bad value. The bug was only the key: in the nested fixture the inner echo is step 1 and the subworkflow is also step 1, so the old shape looked right by accident. A workflow with a top-level tool at index N and an inner step at index N would have put the error on the wrong card.
- **The expanded form reads `err_data` too.** It takes the first entry as `[stepId, [name, message]]`. For an inner error that used to point at whatever top-level step had the inner step's index. Now it points at the subworkflow step with a non-string error, which matches no input, so nothing is highlighted. In both cases the expanded form shows no message for inner errors. That gap predates this branch, and I didn't change the expanded form.

## Errors that don't map to a card

These go to the general submission alert. Each one is listed with the picker's label, for example "Error computing workflow step runtime state: Step 3: echo › Filter type › filter_type - ...". When every error maps to a card, the alert reads "Some step parameters are not valid. Fix the step parameters marked below."

- **Errors for keys with no leaf in the tree, or no card:**
  - conditional test parameters (`cond|filter_type` or `2/cond/filter_type`);
  - repeat-level errors (`2/queries`: "overrides can't add instances");
  - step-level errors (`7`: "no step with this index", "a data_input step takes no parameter overrides");
  - unknown parameters.

  The simple form only sends keys it resolved against the tree, so in practice these come only from a stale recorded rerun or a hand-edited request.
- **Upgrade messages** ("Workflow step has upgrade messages", keyed by step). These map onto a card if a name matches, and otherwise go to the alert.
- **`err_data` that isn't keyed by step index**, or no `err_data` at all. The alert shows the server's `err_msg` unchanged.
- **Errors on a second step.** `populate_module_and_state` raises at the first step with errors, so errors on later steps only appear after the first step is fixed. They aren't unmapped, just reported one step at a time.
- **Failures after the invocation is accepted** (scheduling or job failures). These aren't 400s and never reach the run form.

## Tests

- **vitest**, over the brief's suites: 40 files and 259 tests pass. New tests:
  - `stepParameterErrors.test.ts`: 8 tests covering both shapes, subworkflow nesting, repeat instance names, unknown names, non-step `err_data`, and the card/alert split and its messages.
  - `WorkflowRunStepParameters.test.ts`: 1 test. The card shows the error, gets a red border and clears it on change.
  - `WorkflowRunFormSimple.test.ts`: 1 test. A rejected submission splits errors between the card prop and the alert, and the next submission clears them.
- **E2E**, against a rebuilt `static/dist` on a single Galaxy at :8091 (now stopped):
  - `test_workflow_run_step_parameter_overrides.py`: 10/10 pass. The new test sets the inner echo's run label to "Tuned" one subworkflow deep. It checks that the error lands on the `1/1/advanced/label` card and not on the `1/1/threshold` card, checks the alert text, then fixes the value and submits successfully.
  - `test_workflow_rerun.py::TestWorkflowRun::test_workflow_rerun_prefills_expanded_form`: 1/1 passes with the new wording.
- **API, on the branch**: 69 pass. That is the 11 tests in `test_workflow_step_parameter_overrides.py`, plus 58 in `test_workflows.py` matching `step_parameter` or `subworkflow`, which exercise the changed `inject`.
- **API, on the extraction branch** (`60bb11d66cb`): 60 pass. That is the 11 tests in the new file plus 49 in `test_workflows.py` matching `subworkflow`. I left out the `step_parameter` selection, which includes the 6 tests known to fail from the gxformat2 pin.
- **Lint and types**:
  - vue-tsc is clean.
  - eslint reports 0 errors. The warnings in `Workflow/Run/` are the existing ones; the new files add none.
  - prettier, ruff, black and isort are clean.
  - mypy reports only the unrelated `notification.py:862` error.

## Extraction branch

I re-synced it as earlier phases did. The API 1 patch went on as a fixup of `2ceedb86a81`, followed by an autosquash onto `38dc259318c`. Commits 1 and 3 each hit a one-hunk conflict in the API test file, because the new nested-error assertions sit next to API 3's test. Both resolved to the main branch's file at the matching commit, which was byte-identical to the extraction branch's before this change.

The extraction commit 1 message gets the same new paragraph. `git range-diff` against the main branch's API series shows commit 1 differing only by the two dev-only lines, their message paragraph and stack context, as before. `modules.py`'s change is identical on both branches.

## Deferred

- **The `rerunHasUnshownStepParameterOverrides` alert** still implies the expanded form keeps the values, which holds for top-level steps only (Codex's note). Making it exact means telling inner-step keys apart in `simpleFormDisabledReason`. That's small, but it wasn't part of the two items I was given.
- **Duplicate unlabeled subworkflows share a card prefix.** The scope evaluation suggested folding this into the error mapping. I left it out: the mapping works on keys, not labels, so the collision only affects how the alert reads.
- **The expanded form's handling of `err_data`**, described above. It is a pre-existing gap, and the evaluation says not to invest in the legacy form.
- **No screenshot was saved.** The new E2E test calls `self.screenshot("step_parameter_overrides_card_error")`, but no screenshot directory was configured for these runs.

The worktree is clean on `workflow_step_parameter_overrides`. The alt branch `workflow_step_parameter_overrides_alt_original_scope` is untouched at `20c7b0feaea`.
