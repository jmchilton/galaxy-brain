Run via Claude Opus at high effort.

# Test challenges, round 2: workflow_step_parameter_overrides

2026-11-03. This was a fresh BRANCH_DIRECTORY run of `GX_PROCESS_CHALLENGE_TESTS.md` over `46db8f9d5b6..HEAD`, after the re-scope.

- **Vitest**: I dropped 12 tests that E2E already covers or that pass without the branch. `WorkflowRunStepParameters.test.ts` is gone again, and `WorkflowRunForm.test.ts` and `WorkflowRunFormSimple.test.ts` are back to their base versions. The few things only those tests checked now have E2E assertions, plus one new E2E test.
- **Python unit tests**: they now go through the public `apply_step_parameter_overrides`, not the private walker and prefetch helper.
  - The query-count test now fails if `_apply` stops prefetching. Before, it only checked that the helper prefetches when called.
  - The file no longer imports `tools_support`.
- **API tests**: two helpers, and one table upload per rejection test instead of one per case.
- **The baseline test** passes on `46db8f9d5b6`.
- **Fails without the branch**: every other new API and unit test fails at its own assertion.

Each fix was squashed into its commit, and the commit structure is unchanged. The extraction branch was re-synced.

| Branch | Commits, bottom to top |
|---|---|
| `workflow_step_parameter_overrides` over `46db8f9d5b6` | `58a86dec561` (baseline, unchanged), `b682078c173` (refactor, unchanged), `0919ef03fb4` (API 1), `3bfb3a7732c` (API 2), `d7952c3ab81` (API 3), `01fb08f0231` (picker), `9cb8b3d611f` (workflow view), `c41215aa39d` (rerun with this changed), `b6b1f870a92` (E2E) |
| `workflow_step_parameter_overrides_api` over `origin/dev` `38dc259318c` | `4be8a87cb79` (unchanged), `84bb4eb06ab` (unchanged), `250fa092f0b`, `a450982a010`, `0d5448ef3c8` |

API 2, API 3 and the workflow-view commit changed only their parents. On the extraction branch, the two test files in API 1 are byte-identical to the main branch's. `git range-diff` against the new API series matches the earlier one, with only the SHAs changed.

## Baseline test

`test_run_subworkflow_runtime_parameters_invalid_value` is the only test in the baseline commit.

- **On `58a86dec561`**, which is `46db8f9d5b6` plus the baseline commit, it passed (1 passed). I ran it from a temporary worktree with the branch `.venv`.
- **API 1's updated version** fails on the base server code, at its own shape assertion. `err_data` is `{'1': {'num_lines': ...}}` where the test expects `{'1': {'1': {...}}}`. So the baseline pins the old shape, and API 1 pins the new one.

## Python unit tests (`test/unit/workflows/test_step_parameter_overrides.py`)

The codex and performance passes added three tests here. Two of them called private code directly:

- `TestSwitchedConditionalCaseDefaults` built `_ToolStateWalker(trans, set(), pending)` and called `.visit(tool.inputs, SAVED, overrides, "", ["1"])`. It also used a `Bunch` trans and `UsesTools`. Codex had noted that importing `tools_support` sets global model state, which broke API tests collected in the same session.
- The query-count test called `_load_tool_step_relationships` itself. If `_apply` stopped calling it, the test would still pass. It mostly showed that `selectinload` works.

What I did:

- **I rewrote all three around a `ToolWorkflow` dataclass.** It holds a `MockTrans` and a saved workflow: a data input plus N steps of the inline nested-conditional tool, registered in `MockTrans`'s toolbox.
  - Its `apply()` calls the public `apply_step_parameter_overrides`.
  - The conditional tests now also check the `param_map` that scheduling reads, not only the returned record. The `parameters` case shows that the merged map keeps `outer|inner|kind: k2` and `p: 7`, and adds `q: q2`.
- **The query-count test** is now `test_overriding_more_tool_steps_costs_no_more_queries`. It counts the queries `apply_step_parameter_overrides` runs when overriding every tool step of a 2-step and of a 6-step workflow, and asserts the counts are equal.
- **I considered moving the nested-conditional cases to API tests and decided against it.**
  - They would need a new test tool registered in `sample_tool_conf.xml`. Adding a nested conditional to `echo_step_parameters` instead would change several existing API and E2E expectations.
  - The walker is the kind of isolated, complex component that `writing_tests.md` says unit tests suit. The real problem was reaching into private code, and the public entry point fixes that.
- **The `flatten_tool_state` doctest stays**, for round 1's reason.

**Fails without the change.** I checked by sabotaging the code, then restored it:

- With `_load_tool_step_relationships` made a no-op, the query test fails with `assert 24 == 8`.
- With the codex fix removed (the `pending` branch in `_with_defaults`), the `parameters` case fails on the recorded overrides.
- The other conditional test covers new behaviour, in a module the branch adds.

## API tests

- **Helpers.**
  - `_subworkflow_request(invocation_id)` replaces the three-line get-invocation, then step's `subworkflow_invocation_id`, then `/request` sequence, which two tests repeated.
  - `_table(history_id)` factors out the dataset upload.
  - `_invoke` takes an optional `table_id`. The two rejection tests upload one table and reuse it for their 14 and 5 invocations. Before, `_invoke` uploaded a new dataset for each one.
  - Everything else already goes through populators.
- **The error-shape assertions** (in `test_invalid_overrides_rejected` and `test_invalid_subworkflow_overrides_rejected`) are fine where they are. They sit after each test's validation cases, which fail first without the branch. Those cases are the 400s for bad keys.

### Fails without the branch

I did this fresh, from a worktree at `58a86dec561` with the base server code. Into it I copied the branch's API test file, `test_jobs.py`, `test_workflows.py`, `workflow_fixtures.py`, `echo_step_parameters.xml` and `sample_tool_conf.xml`. Then I ran the 11 new API tests, both `parameters_display` tests and the baseline test.

- **Result**: 13 failed, 1 passed. The pass is the existing `test_parameters_display`, as expected.
- **Every failure is at the test's own assertion.** Without the server change, the field is ignored and the run uses the saved values:
  - `'0.5' == '0.9'`, `'min' == 'regex'` and `'0.7' == '0.9'` on the echoed values;
  - `status_code == 200` in `test_overrides_apply_on_top_of_parameters`, which gets the legacy 400 for the missing `pattern`;
  - `len(rows) == 1` in the export test;
  - the 400 checks in both rejection tests (they got a 200);
  - `"subworkflow_steps" in outer`;
  - `None == ['threshold']` in the path test;
  - the nested `err_data` shape in the updated baseline test.

## Vitest

| Test | Action | Why |
|---|---|---|
| `WorkflowRunStepParameters.test.ts` (8 tests) | file dropped | The thermo-nuclear pass wrote it as a safety net for its refactor. Every behaviour it checks has an E2E test: picking, removing and unchecking cards and the typed `/request` (`test_choose_step_parameters_and_run`); typed values; errors on cards and clearing them on change (`test_server_errors_land_on_their_cards`); rerun values and the "original run" hint; link presets, nulls, dropped keys and malformed links (`test_link_with_preset_and_unusable_parameters`). It also drove the stubbed picker and `FormDisplay` through `vm.$emit`. Only two behaviours lacked E2E coverage: a typed value surviving the *addition* of a card, and the "saved: 0.5" hint. Both are now E2E assertions (below). "Sends no overrides until chosen" was trivial. |
| `WorkflowRunFormSimple.test.ts`: errors on cards and in the alert | dropped; file back to the base version | E2E `test_server_errors_land_on_their_cards` covers cards, alert and clearing. The card-versus-alert split is pure logic, which `stepParameterErrors.test.ts` covers. The test drove the child through `vm.$emit("update:overrides")`. |
| `WorkflowRunForm.test.ts`: the expanded form lists a link's parameters; reports a malformed link | rewritten as the E2E test `test_link_in_expanded_form_lists_its_parameters` | The E2E test is easy to write with `workflow_run_ensure_expanded`. The vitest needed a `buildModelWithListRepeatCaches` fixture hack, because `run1.json` keys repeat caches by index. |
| `WorkflowRunForm.test.ts`: no alert without a link | dropped; file back to the base version | It passes without the branch. |
| `JobStep.test.ts`: not offered in a subworkflow invocation | rewritten | It passed without the branch: base `JobStep` never sets `rerun-step-index`. It now mounts the same job under the parent and under a subworkflow invocation, against one realistic `/api/invocations?job_id` mock, and asserts `"2"` and then `undefined`. |
| `JobStep.test.ts`: one check per invocation across polling | kept | A request-count property, which only a unit test can pin. It fails on the old code with 5 requests. |
| `stepParameterErrors.test.ts` | kept | Pure data in, data out, with no mocks. E2E checks one nested error on one card. The unit tests cover key mapping for sections, repeat instances and conditionals; path-keyed validation errors; non-step `err_data`; and the alert text. |
| `stepParameterTree.test.ts`, `stepParameterGraph.test.ts` | kept | Pure logic, as round 1 found. Nothing in them changed since. |

The client README's "test behaviour, not implementation" and "prefer E2E for multi-component integration" rules drove the drops. No mocks remain that a noop or shared utility could replace.

## E2E

Changes to `test_workflow_run_step_parameter_overrides.py`:

- **New test, `test_link_in_expanded_form_lists_its_parameters`.**
  - It loads a malformed link and switches to the expanded form. It asserts "not valid JSON" in the linked-parameters alert.
  - It then loads `{2: {threshold: null, cond: {min: 7}}}`. It waits for the simple form's card, switches to the expanded form and asserts the alert's "can't preset" text, the `Step 3: echo › Threshold` item and the `2/cond/min` item.
  - New selectors in `navigation.yml`: `workflow_run.linked_step_parameters` and `linked_step_parameter`.
- **`test_choose_step_parameters_and_run`.** The second picker pass now also adds `advanced/label`. The test asserts that the new card shows `run`, and that the typed `threshold` 0.9 and `cond/min` 5 survive. The expected `/request` gains `advanced: {label: "run"}`.
- **`test_link_with_preset_and_unusable_parameters`** asserts the `saved: 0.5` hint on the null-valued card.

**Framework fix.** `workflow_run_ensure_expanded` failed on its second call in a session. The simple form's runtime settings toggle persists (`usePersistentToggle`), so the second click closed the panel and the expand link never showed. The helper now clicks only when the link is absent. This went into the E2E commit, and its message says so.

**Without the branch**, by reasoning: the new test fails at `linked_step_parameters.wait_for_visible()`, because base `WorkflowRunForm` has no such alert. The `advanced/label` card and the hint assertions fail without the picker commit.

## Evidence

- **Baseline on `58a86dec561`**: 1/1 passed.
- **API, branch**: 14/14 passed. That is the 11 new tests, `test_parameters_display`, `test_parameters_display_override_paths` and the baseline test.
- **API, without the server change**: 13 failed and 1 passed, as described above.
- **API, extraction branch `0d5448ef3c8`**: the same 14 passed. I ran them from a temporary worktree with the branch `.venv`, then removed it. I didn't rerun the 6 known gxformat2-pin failures.
- **Unit**:
  - `test/unit/workflows/`: 202 passed, 2 skipped. The skips are workflowhub.eu being down and an env-gated Dockstore test.
  - The new file plus the module doctest: 4/4, on both branches.
- **Vitest** over the brief's suites: 39 files, 247 tests passed. Before: 40 files, 259 tests. 12 tests were dropped, and the 2 `JobStep` tests became 2.
- **E2E**: Playwright, client rebuilt into `static/dist`, a single Galaxy on :8091.
  - First run: 11 passed and 1 failed. The failure was the new test, from the `ensure_expanded` bug.
  - After the fix, the new test passed alone.
  - Final run on the squashed branch: 14/14 passed. That is the 11 tests in the override file (10 existing plus the new one), #24177's `test_workflow_rerun_prefills_expanded_form`, and the two `test_workflow_run.py` tests that call `workflow_run_ensure_expanded` (`test_workflow_run_pagination_legacy_form` and `test_workflow_run_input_step_load_more_appends`), to check the helper fix. Galaxy :8091 is stopped.
- **Lint and types**:
  - ruff, black and isort: clean on the changed Python files.
  - mypy from `lib/`: only the known `notification.py:862` error. The unit test casts `MockTrans` to `ProvidesHistoryContext`, as `test_run_parameters.py` does.
  - prettier: clean, including `navigation.yml`. eslint: 0 errors.
  - vue-tsc: clean.

## Deferred

Nothing. All the test changes were made and run.
