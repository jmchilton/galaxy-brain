Run via Claude Opus at high effort.

# Test challenges: workflow_step_parameter_overrides

2026-11-03. This was a BRANCH_DIRECTORY run of `GX_PROCESS_CHALLENGE_TESTS.md` over `46db8f9d5b6..HEAD`. I dropped 16 vitest tests that E2E covers or that pass without the branch. The few behaviours only they checked now have E2E assertions, plus one new E2E test. The `parameters_display` path test moved into `test_jobs.py` and now runs the tool directly. Every API test now fails at its own assertion without the server change. Each fix was squashed into its commit. The commit structure is unchanged and the extraction branch was re-synced.

| Branch | New SHAs (bottom to top) |
|---|---|
| `workflow_step_parameter_overrides` over `46db8f9d5b6` | `d018b32d39a` (API 1), `8cb020517ad` (API 2), `9b2d7f3f375` (API 3), `c716f426928`, `749019536a4`, `1265b87284b`, `cc1b25b559d` |
| `workflow_step_parameter_overrides_api` over `origin/dev` `38dc259318c` | `c854c5b4d31`, `e2244efa9e3`, `901c7e221e2` |

`1265b87284b` ("Rerun with this changed") is unchanged apart from its parent.

## Note on the brief

The brief mentions "the `parameters_display` path test in test_jobs.py". At the start of this run, that test was `test_job_parameters_display_override_paths` in the new API file. `test_jobs.py` held only the existing `test_parameters_display`, which the branch didn't touch. The move below puts the path test where the brief expected it.

## API tests

- **Path test moved to `test_jobs.py`** (commit 2), as `test_parameters_display_override_paths`.
  - It used to invoke a workflow just to get one job. Paths come from the job's tool state, so a direct `run_tool` of `echo_step_parameters` tests the same thing without the workflow machinery. It now sits next to the endpoint's other test.
  - `datasets/{id}/parameters_display` was now called twice, so it gained a `_dataset_parameters_display` helper. The existing `test_parameters_display` uses it too.
- **`test_run_form_lists_subworkflow_tool_steps`** (commit 3). Without the server change it died with a `KeyError` on `outer["subworkflow_steps"]`. It now asserts the key is present first.
- **`test_overrides_apply_on_top_of_parameters`** (commit 1). Without the server change it failed inside `_invoke_ok`'s status check.
  - The reason: legacy `parameters` alone that switch `cond` to `regex` get a 400 for the missing `pattern`, and with the branch the override supplies it. That 400 is the behaviour under test.
  - The test now asserts the 200 itself, with a comment saying why. `_invoke_ok` was split so the test can reuse its waiting part, `_wait_for_invocation`.
- **Helpers**: the API tests already use populators throughout (`invoke_workflow_raw`, `invocation_to_request`, `download_invocation_to_store`, `create_invocation_from_store`, `download_workflow`). No other URL is called more than once.
- **Kept as they are**: the export/import test reading `invocation_attrs.txt` from the tarball, and `_inner_step_parameters`, which [phase B's review](subagents/phase_b_normal_review.md) already justified.

### Fails without the branch

I put back `46db8f9d5b6`'s versions of the 7 changed server modules under `lib/galaxy/`, removed `step_parameter_overrides.py`, and kept the test infrastructure (fixtures, `echo_step_parameters`). Then I ran the 12 new API tests and the existing `test_parameters_display`.

- **Result**: 12 failed, 1 passed. The pass is the existing `test_parameters_display`, which is expected.
- **Every failure is at the test's own assertion.** The run predates the `test_overrides_apply_on_top_of_parameters` fix, so that test failed in the helper. Its failure point is now the test's own status assertion.
  - The 7 override-application tests fail on echoed values: `'0.5' == '0.9'`, `'min' == 'regex'` and `'0.7' == '0.9'`. Without the server change, the field is ignored, because `InvokeWorkflowPayload` allows extra keys.
  - The export test fails on `len(rows) == 1`.
  - Both rejection tests fail at `status_code == 400` (they got a 200).
  - The run form test fails at the new `"subworkflow_steps" in outer`.
  - The path test fails at `None == ['threshold']`.
- I then restored the server files. With the branch, all 13 pass.

## Doctest

`flatten_tool_state` keeps its doctest. It is clean and isolated, and it documents the one non-obvious rule: a list of objects is a repeat, and any other list is a multi-value parameter. `writing_tests.md` allows a doctest in exactly that case. The API tests never exercise the multi-value case. `run_tests.sh -unit` collects `lib/` with `--doctest-modules`, so CI runs it. It passes.

## Vitest

| Test | Action | Why |
|---|---|---|
| `NodeInvocationText.test.ts`: "renders the text a non-input step supplies" | dropped; file back to the base version | E2E `_assert_workflow_node_text` checks node text on tool and subworkflow nodes. |
| `StepParameterPicker.test.ts`: list and workflow view share one picked set | file dropped | `test_list_and_workflow_view_share_picked_parameters` covers both directions and the removal on apply. The unit test drove child components through their `$emit`s. |
| `StepParameterPicker.test.ts`: reopening without applying starts from the form's set | moved to E2E | `test_choose_subworkflow_step_parameter` now picks, cancels, checks no card appeared, reopens and checks the box is cleared. |
| `WorkflowRunFormSimple.test.ts`: rerun re-show and submit | dropped; file back to the base version | `test_rerun_reshows_step_parameter_overrides` covers it. |
| `WorkflowRunFormSimple.test.ts`: no overrides sent when none are shown | dropped | It passes without the branch. |
| `WorkflowRunStepParameters.test.ts` (5 tests) | file dropped | Empty state: trivial. Rerun cards: E2E rerun test, which now also asserts the "original run: 0.75" hint. Link preset, null and dropped: E2E link test, which now also submits and asserts `{cond: {min: 7}, threshold: 0.5}`, the typed workflow value for a null. Malformed link: the E2E link test now loads a `{` link and asserts "not valid JSON". Typed values and apply: the E2E run tests check the typed `/request`. |
| `simpleFormDisabledReason.test.ts` (3 tests) | file dropped | Two of them pass without the branch, and E2E covers them: the rerun stays simple, and legacy `parameters` still go to the expanded form. The third, a switched case going to the expanded form, became the new E2E test below. |
| `stepParameterTree.test.ts`: "locks the conditional test param", "carries leaf values and help" | dropped | E2E `_assert_picker_details` checks "workflow sets to Minimum", the lock tooltip, "workflow sets to 0.5" and the help popover. `resolveStepParameterKeys` covers a key in the inactive case. |
| `stepParameterTree.test.ts`: "diffs a picked set" | dropped | A 5-line set difference. E2E apply covers additions and removals. |
| `stepParameterTree.test.ts`: other tests | kept | Pure logic with no mocks: keys and paths, subworkflow labels, filtering (E2E only screenshots it), `displayValue`, key resolution and labels, building and reading overrides, the round trip, typing and route parsing. |
| `stepParameterGraph.test.ts` | kept | A pure function. E2E counts tool and one-level subworkflow nodes, but not counting two levels deep, steps with nothing to choose, or the header state. |

No mocks remained to replace. The kept files are plain data-in, data-out tests.

## E2E

The E2E file already covered the feature well. Changes:

- **New test, `test_rerun_with_switched_conditional_case_stays_expanded`.**
  - It runs the workflow through the API with `{cond: {filter_type: regex, pattern: "^chr"}}`, then opens its rerun.
  - It asserts the expanded form opens and the "can't show, such as a conditional's selected case" reason appears.
  - It asserts the echo step's `cond|pattern` preview shows `^chr`, then resubmits and checks the job ran with `regex` and `^chr`. This shows the expanded form really keeps what the simple form can't show.
- **New assertions in existing tests**: the reopen reset, the "original run" hint, the malformed-link error, and the link test's submit and `/request` check. The legacy-rerun test now also checks its reason text.
- **Smart components**:
  - Hard-coded `.popover-body` and `.g-tooltip[data-show="true"]` became `step_parameters.help_popover` and `step_parameters.lock_tooltip` in `navigation.yml`.
  - New selectors: `picker_cancel` and `link_error`.
  - `_new_invocation_id` now uses `workflow_populator.history_invocations(..., include_nested_invocations=False)` instead of a raw `_get("invocations")`.
- **Without the branch**: by reasoning, the new test fails at `expanded_form.wait_for_visible()`. Without the server change the override is ignored, the rerun has nothing to re-show, and the form stays simple.

## Evidence

- **API, branch**: 13/13 passed (11 in `test_workflow_step_parameter_overrides.py`, plus `test_jobs.py` `test_parameters_display` and `test_parameters_display_override_paths`).
- **API, without the server change**: 12 failed and 1 passed, as described above.
- **API, extraction branch**: the same 13 passed on `901c7e221e2`. I ran them from a temporary worktree with the branch `.venv`, then removed the worktree.
- **Doctest**: 1/1 passed.
- **Vitest** over the brief's suites: 38 files, 237 tests passed. Before: 41 files, 253 tests. 16 tests were dropped.
- **E2E** (Playwright, client rebuilt into `static/dist`, Galaxy on :8091): 9/9 passed. That is the 8 existing tests plus the new one. I also ran the 5 changed tests on their own first, and all passed.
- **Lint and types**:
  - vue-tsc: clean. eslint: 0 errors. prettier: clean, including `navigation.yml`.
  - ruff, black and isort: clean on the three changed Python test files.
  - mypy from `lib/`: only the unrelated `notification.py:862` error.

## Deferred

Nothing. All the test changes were implemented and run.
