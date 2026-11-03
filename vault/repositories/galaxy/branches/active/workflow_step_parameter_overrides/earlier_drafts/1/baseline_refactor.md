Run via Claude Opus at high effort.

One refactor commit now sits at the very bottom, below API commit 1. It moves the run form's tool step model out of `_workflow_to_dict_run` into `WorkflowContentsManager._tool_step_run_model`, with no behaviour change. As a result, API commit 3 only adds code.

## The refactor commit

`fca8a3145fa` Factor the run form's tool step model out of _workflow_to_dict_run

- **What moved.** The `step.type == "tool"` branch of `_workflow_to_dict_run` loads the tool, materializes it and turns the step's saved state into tool inputs. That code now lives in `_tool_step_run_model(trans, step, history)`. The method returns `tool.to_json(...)`, and the call site keeps adding `post_job_actions` as before. The body is unchanged.
- **Why it helps.** Phase B made this move inside API commit 3, because `_subworkflow_run_steps` builds inner tool steps the same way. Reviewers of commit 3 saw a 15-line deletion and re-addition mixed in with the feature. Commit 3 (`ba7b283e5af`) is now 51 added lines and no deletions: the `subworkflow_run_steps` cache, the `subworkflow_steps` key and `_subworkflow_run_steps` itself.
- **Extraction.** The commit cherry-picks cleanly onto the extraction branch's base (`38dc259318c`) and onto current `origin/dev` (`66760b89269`). The whole new API series also picks cleanly onto current `origin/dev`.

## Final state

| Branch | Commits, bottom to top |
|---|---|
| `workflow_step_parameter_overrides` over `46db8f9d5b6` | `fca8a3145fa` (refactor), `fbc1d820771` (API 1), `3e5d292127d` (API 2), `ba7b283e5af` (API 3), `e2c14be0a54`, `e0f9807999d`, `6891e7cd63f`, `20c7b0feaea` |
| `workflow_step_parameter_overrides_api` over `38dc259318c` | `aa46cdf054e` (refactor), `2ceedb86a81`, `ba71aa74931`, `7fc21321da9` |

- **Tree check.** Both heads are byte-identical to their pre-restructure heads (`061694e7edb` and `2578e77912d`). Commits from API 3 upward have the same trees as before. Only the refactor commit and API commits 1 and 2 have new trees, which now include the refactor.
- **Range-diff.** `git range-diff` of the extraction series shows API 1 and API 2 identical. API 3 differs only by the moved lines it no longer carries.
- **Conflicts.** API 3 conflicted on both branches, and the resolution was the old commit's file each time. On `dev` the conflict was the same context-only one earlier re-syncs hit, because `dev` lacks #24176's `request_input_labels` line.

## Candidates not taken

- **`_dataset_parameters_display` in `test_jobs.py`.** API commit 2 replaces one 3-line `_get` call in `test_parameters_display` with the helper. A separate commit would cost reviewers more than the one-line change it removes from commit 2, so I left it there.
- **`useWorkflowRunGraph` switching to `getFullWorkflowCached`.** The behaviour isn't identical. The run graph would get the store's shared, cached object instead of a fresh fetch, which is a change the client-only rule forbids. The switch also has no purpose until the pop-out view shares the fetch, so it stays in that commit.
- **The `NodeInvocationText.vue` change.** It renders string `nodeText` for non-input steps. That is new behaviour the workflow view needs, not a refactor.
- **`WorkflowRunFormSimple.vue`.** The branch only adds to it: one import, a prop, a ref, the `step_parameter_overrides` payload line and the `WorkflowRunStepParameters` mount. There is nothing to extract.
- **Others I checked.** The changes to `jobs.py`, `run_request.py`, `services/invocations.py`, `JobParameters.vue`, `JobDetails.vue`, `JobStep.vue`, `WorkflowRun.vue`, `WorkflowRerun.vue`, `WorkflowRunForm.vue` and `simpleFormDisabledReason.ts` only add new behaviour or thread props through. None of them contains a refactor that could sit on the base.

## Checks

- **At the refactor commit (`fca8a3145fa`).** I selected the 15 `test_workflows.py` test names that download `style="run"`, covering run form seeding, value restrictions, broken datasets, instance download and more. They matched 16 cases, and all 16 passed. black, ruff and isort are clean.
- **At the branch head (`20c7b0feaea`).**
  - API: 33 passed. That is 20 tests in `test_workflows.py` (the run-form set plus `-k step_parameter`), 2 in `test_jobs.py -k parameters_display` and the 11 in `test_workflow_step_parameter_overrides.py`.
  - Unit: `test/unit/workflows/` passed 203, with 1 skipped.
  - Vitest: 39 files and 249 tests passed across the relevant suites.
  - mypy: only the unrelated `notification.py:862` error.
- **On the extraction branch (`7fc21321da9`).**
  - API: 27 passed. That covers the run-form set, `parameters_display` and the new API file. The 6 step-parameter tests known to fail on `dev` because of the gxformat2 pin were excluded.
  - Unit: `test_step_parameter_overrides.py` passed 3.
- **E2E.** Not run. No client code changed, and the client tree is identical.

Nothing was pushed. The worktree is clean on `workflow_step_parameter_overrides`.
