Run via Claude Opus at high effort.

The base gets one refactor commit, round 1's `b682078c173` "Factor the run form's tool step model out of _workflow_to_dict_run". It moves the tool step branch of `_workflow_to_dict_run` into `WorkflowContentsManager._tool_step_run_model` with no behaviour change. Round 2 found nothing new to move below the feature, so the history is unchanged.

## The refactor commit

`b682078c173` sits second from the bottom. Only the "Baseline tests for subworkflow step parameter value errors" commit is below it.

- **What moved.** The `step.type == "tool"` branch of `_workflow_to_dict_run` loads and materializes the tool, then turns the step's saved state into tool inputs. That code is now `_tool_step_run_model(trans, step, history)`, which returns `tool.to_json(...)`. The call site still adds `post_job_actions`. The moved body is unchanged.
- **Why.** API 3 (`d7952c3ab81`, "List subworkflows' tool steps...") builds inner tool steps the same way. With the move done first, its `workflows.py` change is 36 added lines and no deletions.
- **Same commit as round 1.** Its patch is byte-identical to round 1's `fca8a3145fa`. The SHA changed only because the re-scope put the baseline tests commit under it. Its tree is round 1's tree plus that test-only commit's 14 lines in `test_workflows.py`.
- **Extraction branch.** `workflow_step_parameter_overrides_api` is in sync. `git range-diff` against the branch's bottom five commits shows the baseline (`4be8a87cb79`), refactor (`84bb4eb06ab`) and API 2 identical. API 1 differs only by the two dev-only additions (`param_map.get(step.id)` and the `None` check in `services/invocations.py`). API 3 differs only by context lines from the stack that `dev` lacks.

## Round-2 candidates not taken

The re-scope and two hardening passes added or changed these edits to existing code. None is a behaviour-preserving refactor that would make the feature commits easier to review.

- **`WorkflowModuleInjector.inject` error nesting** (`modules.py`, API 1). This changes the `err_data` shape for errors in inner subworkflow steps. The baseline tests commit pins the old shape and API 1 updates it, so it is a deliberate behaviour change and stays in API 1.
- **The `workflow_run_ensure_expanded` fix** (`navigates_galaxy.py`, E2E commit).
  - This fixes a bug in a helper already on `dev`, so it is not a refactor. With the runtime settings panel closed, the helper behaves exactly as before. With the panel open (`usePersistentToggle` keeps it open across page loads), the old code clicked the toggle, closed the panel and then couldn't find the expand link.
  - On the base, every test calls the helper only once, so no base test hits the bug and a separate commit would land untested. Only this branch's new E2E tests call it twice in one browser session.
  - The fix is 3 lines and the E2E commit message explains it. If John wants it upstream on its own, it can be cherry-picked onto `dev` as a standalone fix.
- **The `WorkflowRunForm.vue` changes** (picker commit).
  - The `rerunHasStepParameters` alert text changes because the simple form now supports overrides, so the old wording ("does not support these") would be false. It is a behaviour change, and #24177's `test_workflow_rerun.py` assertion changes with it.
  - The rest is new code: the `rerunHasUnshownStepParameterOverrides` reason, the linked-parameters alert, the prop and the computeds.
- **The `_dataset_parameters_display` test helper** (`test_jobs.py`, API 2). Round 1 declined this and the reason still holds. The helper replaces one 3-line `_get` in `test_parameters_display`, and the new `test_parameters_display_override_paths` is its second caller. A separate commit would cost reviewers more than the one call it takes out of API 2.
- **Threading `path` through `inputs_recursive`** (`jobs.py`, API 2). Adding the `path=()` argument first, with no consumer, would be a refactor with no purpose. The argument only means something together with the `path` field on the rows.
- **`flatten_tool_state` compared with `run_request._flatten_step_params`.** The two can't be unified without a behaviour change. The legacy function keeps `{src, id}` dicts and `__POST_JOB_ACTIONS__` as values, and it doesn't expand repeat lists into `name_<i>|` names. `flatten_tool_state` treats a list of objects as a repeat.
- **`WorkflowRunFormSimple.vue` `onSubmissionError`.** This replaces a one-line `emit("submissionError", errorMessageAsString(error))` with error routing to the cards. Extracting the function first would move a single line, so there is nothing to gain.
- **Import and structural edits.** The only import change in an existing file is `useWorkflowRunGraph.ts` switching `getWorkflowFull` to `useWorkflowStore().getFullWorkflowCached`. Round 1 declined it because the run graph would then get the store's shared cached object instead of a fresh fetch, which is not behaviour-identical. It stays in the workflow view commit, which is the reason for it. Every other edit to an existing file only adds imports, props, payload lines or schema fields: `services/invocations.py`, `run_request.py`, `schema/invocation.py`, `schema.ts`, `WorkflowRun.vue`, `WorkflowRerun.vue`, `router.js`, `simpleFormDisabledReason.ts`, `NodeInvocationText.vue`, `JobParameters.vue`, `JobDetails.vue`, `JobStep.vue`, `WorkflowInvocationStep.vue` and `api/invocations.ts`.
- **Fixture positions** (`workflow_fixtures.py`, E2E commit). The E2E commit adds graph positions to two fixtures that API 1 introduces. Both fixtures are this branch's own, so this is not a base refactor. Moving the positions into API 1 would bring E2E-only layout into the extraction series.

## Final state

| Branch | Commits, bottom to top |
|---|---|
| `workflow_step_parameter_overrides` over `46db8f9d5b6` | `58a86dec561` (baseline), `b682078c173` (refactor), `0919ef03fb4` (API 1), `3bfb3a7732c` (API 2), `d7952c3ab81` (API 3), `e1c0b115a1d` (picker), `74402d218bd` (workflow view), `0969ce6e2de` (rerun with this changed), `3595a8429e3` (E2E) |
| `workflow_step_parameter_overrides_api` over `38dc259318c` | `4be8a87cb79`, `84bb4eb06ab`, `250fa092f0b`, `a450982a010`, `0d5448ef3c8` |

No commit was added, reordered or rewritten. The head is still `3595a8429e3`, so the final tree is the HEAD tree. The extraction branch did not need a re-sync.

## Checks

- **At the refactor commit (`b682078c173`), checked out detached.** I selected 22 tests from `test_workflows.py`: every test that downloads `style="run"` or exercises the run form, plus the baseline `test_run_subworkflow_runtime_parameters_invalid_value`. All 22 passed.
- **Not rerun.** The history didn't change, so I didn't rerun the head suites (API, unit, vitest) or E2E. No client code changed. The re-scope and hardening debriefs have the counts on the current SHAs.

Nothing was pushed. The worktree is clean on `workflow_step_parameter_overrides`.
