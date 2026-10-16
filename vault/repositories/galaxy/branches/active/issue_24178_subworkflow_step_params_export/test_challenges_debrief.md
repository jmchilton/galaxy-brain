# Test challenges debrief (re-scope)

I made one commit, `b9b5d16b1d9`, which has not been pushed. It makes three changes:

- It strengthens the unit tests for `resolve_step_parameters` so that every `ValueError` path the docstring promises is pinned.
- It routes the round-trip unit test through the real resolver.
- It moves two API tests onto the existing helpers.

No test was dropped, nothing changed at the implementation level, and I added no E2E test.

**Not acted on:**

- **Collision unit test → API.** Not possible to do deterministically, because DB ids are global. I kept it at the unit layer and gave it a name that describes the collision.
- **Positive `0|input` 200 case for `test_run_with_invalid_legacy_parameter_input_in_subworkflow`.** Out of scope. That subworkflow has no inner steps to consume the value, so a 200 would prove little.
- **Contract gap: a non-dict JSON value for a subworkflow row raises `AttributeError`, not `ValueError`.** Examples are `[1]` or `2` for a subworkflow step id.
  - This is not listed in the contract, and the contract must not change on this branch, so I did not pin it.
  - It is worth a look for #24176's skip loop, which only catches `ValueError` and `None`.
- **Older sibling `test_run_with_invalid_legacy_parameter_input` still calls raw `_post`.** It is not a branch test, so I left it alone.

<details>

## Changes in `b9b5d16b1d9`

- **New helper `_resolve_step_parameter_row(workflow, name, value)` (unit).** It builds a real `WorkflowRequestInputParameter` on a `WorkflowInvocation`, with no mocks.
- **`test_nested_subworkflow_step_parameters_round_trip`.**
  - Before, it asserted on `step_parameters_by_index` over a hand-made `json.loads(json.dumps(...))`.
  - Now it serializes the normalized dict exactly as `workflow_run_config_to_request` stores it (`json.dumps`). It then asserts that `resolve_step_parameters()` returns `(subworkflow_step, by_index)`.
  - The export path's real entry point now gets the coverage for two levels of nesting and for a `|` inside a name.
- **`test_resolve_step_parameters` is split into two tests.**
  - `test_resolve_step_parameters_unknown_step` covers the `None` result for an unknown outer step id and for an unknown inner step id.
  - `test_resolve_step_parameters_malformed_row` covers the `ValueError` cases: no name, no value, non-numeric outer id, non-numeric inner id and bad JSON. Only the non-numeric outer id case existed before.
  - Bad JSON counts as a `ValueError` only because `JSONDecodeError` subclasses `ValueError`. Pinning it protects the stacked siblings if the resolver's `try` is ever refactored.
  - The old happy-path assertion is dropped, because the round-trip test now covers it more thoroughly.
- **`test_subworkflow_invocation_records_its_own_step_parameters` is renamed to `test_subworkflow_step_parameters_do_not_leak_on_step_id_order_index_collision`.**
  - The API rerun test already covers "records its own"; the new name says what this test uniquely catches.
  - Red check: I flipped `.get(step.id)` back to `.get(step.order_index)`, and the test failed with `{'seed': 'outer'} == {'3': {'seed': 'inner'}}`. I then restored the line with `git checkout`.
- **`test_run_with_invalid_legacy_parameter_input_in_subworkflow` (API).** It now calls `workflow_populator.invoke_workflow_raw` instead of a raw `_post`.
- **`test_run_subworkflow_runtime_parameters_invalid_key` (API).** It now uses `assert_error_message_contains`, the helper from the test guide, instead of indexing `response.json()["err_msg"]`.

## Verdicts

| Test | Layer | Verdict |
| --- | --- | --- |
| `test_workflow_request_step_parameters_rerun` | API | Keep. It is the only top-level check that a conditional `seed_source\|seed` key passes through. |
| `test_workflow_request_subworkflow_step_parameters_rerun` | API | Keep. It covers the issue end to end: the subworkflow invocation's own `/request`, then a rerun, then the rerun output has 2 lines. |
| `test_run_subworkflow_runtime_parameters_invalid_key` (4 cases) | API | Keep, with the helper assertion. It covers every 400 path, including `unknown_outer_index`. |
| `test_run_with_invalid_legacy_parameter_input_in_subworkflow` | API | Keep, with the populator helper. It pins the recursive check that `parameter_input` must specify `input`. |
| `test_nested_subworkflow_step_parameters_round_trip` | unit | Keep, now routed through the resolver. A doubly nested API fixture would cost far more. |
| `test_resolve_step_parameters_*` | unit | Keep and strengthen. This is the contract the siblings depend on, and its `None` and `ValueError` paths can't be reached through the API on this branch. |
| collision test | unit | Keep and rename. It can't be reproduced deterministically at the API layer, and the red check is confirmed. |

There are no mocks to replace. The only test double is `MockTrans`, which is the existing shared utility, and the tests use `yaml_to_model` and real model objects.

## E2E

None. The change is server-only.

## Runs

- **Unit:** `pytest test/unit/workflows`: 198 passed, 1 skipped.
- **mypy (from `lib/`):** no errors in `test/unit/workflows`. All 23 errors it reports are in unrelated library modules (stub and `type: ignore` noise).
- **Lint:** isort, black and ruff are clean, and the pre-commit hooks passed.
- **API (under the lock):** `-k "test_run_subworkflow_runtime_parameters_invalid_key or test_run_with_invalid_legacy_parameter_input_in_subworkflow or step_parameters_rerun"`: 7 passed (33.9s).

</details>
