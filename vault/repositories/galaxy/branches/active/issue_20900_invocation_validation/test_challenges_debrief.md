Run via Claude Opus at high effort.

**Changed:** dropped `_invoke_by_name`, `_upload_parameter_input_workflow`, two duplicate tests and the landing unit test. Tests now use `workflow_populator.invoke_workflow*` and gxformat2 `validators:` via `client_convert=False`. The landing unit test became an API test (unknown, unclaimed or foreign `landing_uuid`, no history). Added a batch no-history test and strengthened 6 tests. Head `3c9b3fbed60` -> `4b4c7d39b9a`. Source is unchanged and the shape is still 3 commits.

## Not acted on

- **Repeated history-name assertion.** `assert not [h for h in get_histories() if h["name"].startswith(name)]` now appears about 15 times, most of them in dev. A shared helper would mean refactoring dev tests outside this branch's scope. Worth a small follow-up.
- **`self._delete(.../dataset_collections/{id})` in `test_run_with_deleted_inputs`.** Used once, and no populator helper deletes an HDCA. Not worth a helper for one call.
- **No E2E test.** This is server-side request validation with no client change. The API status, message and no-history assertions express the contract directly.
- **`test_run_with_mappable_collection_type` kept, though dev's `test_mapping_and_subcollection_mapping` and `test_workflow_resume_with_mapped_over_collection_input` cover the related case.** Those dev tests use an *untyped* `collection` input. This test pins the *typed* `collection_type: list` input accepting `list:list`, which is the case the dropped collection-type check broke. John has an open decision on restoring that check, and this is its guard.
- **Batch behavior beyond the first-invalid case** (for example an invalid data input in entry 2) was not added. One batch test already proves the whole request is validated before any history is created.

## Per-test verdicts

### `lib/galaxy_test/api/test_workflows.py`

| Test | Commit | Verdict |
| --- | --- | --- |
| `_invoke_by_name` helper | 1 | **Dropped.** Duplicated `WorkflowPopulator.invoke_workflow(..., inputs_by="name")` / `invoke_workflow_and_assert_ok`. |
| `_upload_parameter_input_workflow` helper | 1 | **Dropped.** Its comment ("gxformat2 does not carry parameter validators through") is stale. Server-side conversion (`client_convert=False`) carries `validators:`, as dev's `test_run_format2_workflow_rejects_regex_mismatch_text_parameter` already does. That removes the native `tool_state` patching. |
| `test_run_with_parameter_input_as_string` [3] | 1 baseline | Kept. Now uses `invoke_workflow_and_assert_ok`. |
| `test_run_with_parameter_input_not_in_suggestions` | 1 baseline | Kept, same switch. |
| `test_run_with_optional_parameter_input_empty` | 1 baseline | Kept, same switch. |
| `test_run_with_multiple_text_parameter_input_validated_per_value` | 1 baseline | Kept. Rewritten as format2 `type: [text]` + `validators:`. The 400 message is tightened to `parameter: must start with a`. Dev has no API test for this case. |
| `test_run_with_mappable_collection_type` | 1 baseline | Kept. **Strengthened** to assert that the invocation's input is the submitted HDCA, not just a 200. |
| `test_run_with_library_dataset_input` [ld, ldda] | 1 baseline | **Dropped.** A strict subset of dev's `test_run_with_library_input` (same srcs; dev also checks `copied_from_ldda_id`, the target history and `@requires_new_library`). |
| `test_run_with_parameter_input_of_wrong_type` [10] | 2 | Kept. **Strengthened.** It now asserts the exact `parameter: {a string, an integer, a float, a boolean} is required`, not just `"parameter: "` + `"is required"`. The old `_history_jobs(history_id) == []` assertion was vacuous because a step-less workflow never makes jobs. It is replaced by `workflow_invocations(workflow_id) == []`. |
| `test_run_with_parameter_input_not_in_restrictions` [2] | 2 | Kept. Uses populator helpers. |
| `test_run_with_validated_text_parameter_input_of_wrong_type` | 2 | **Dropped.** The regex half duplicates dev's `test_run_format2_workflow_rejects_regex_mismatch_text_parameter`. In the type half, dev already returns 400 (the regex message), so the only red was a message mismatch. The type check itself is covered by `of_wrong_type[text-5]`. |
| `test_run_with_dataset_for_collection_input` | 2 | Kept. **Strengthened** with no invocation. |
| `test_run_with_deleted_inputs` | 2 | Kept. The three cases are folded into a table loop. **Strengthened** with no invocation. |
| `test_invalid_run_request_creates_no_history` | 2 | Kept. **Strengthened** with no invocation. |
| `test_invalid_batch_entry_creates_no_history` | 2 | **New.** Batch `["UPPER", "lower"]` against a regex-validated text input with `new_history_name`. This is the restructure's core claim: dev rejects entry 2 only after committing entry 1's history. |
| `test_invalid_step_parameter_creates_no_history` | 2 | Kept. Raw `_post` replaced by `invoke_workflow_raw`. **Strengthened** with no invocation. |
| `test_run_with_unknown_landing_uuid` | 3 | **Moved** into the parametrized landing API test below. |

### `lib/galaxy_test/api/test_landing.py`

- `test_invoke_with_unusable_landing_uuid_creates_no_history` [unknown → 404, unclaimed → 409, claimed_by_other_user → 403] (commit 3, **new**). It invokes the landing's own workflow with its `request_state`, so dev gets past input handling and reaches the association step. It asserts no invocation and no history. It sits beside the existing landing helpers (`_get_simple_landing_payload`, `_can_claim_request`).

### `test/unit/app/managers/test_landing.py`

- `test_claimed_workflow_landing_request_model_checks_ownership`: **dropped**, and the file is back to dev's version. It exercised dev's unchanged `_check_ownership` through a method that was only renamed to be public. Dev's API tests (`test_create_private_workflow_landing_*`) already cover that ownership logic via GET. The branch's actual new behavior is that invocation rejects the landing request before creating a history. That is API-testable, and the new test above covers it.

## Red/green evidence

Environment for all API runs: `GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false GALAXY_CONFIG_ENABLE_BETA_WORKFLOW_MODULES=true GALAXY_CONFIG_OVERRIDE_ENABLE_BETA_TOOL_FORMATS=true GALAXY_TEST_TOOL_CONF=...`. One session at a time.

Selection: `pytest lib/galaxy_test/api/test_workflows.py lib/galaxy_test/api/test_landing.py -k "<all tests above> or test_workflow_landing_to_invocation_association or test_run_with_library_input"`.

- **Branch sources:** 30 passed (24 workflow cases + 3 landing cases + 1 association positive control + 2 dev library-input cases).
- **Dev's versions of `landing.py`, `services/workflows.py`, `modules.py`, `run_request.py`** (copied in from `git show origin/dev:`, then restored; `git status` and `cmp` confirmed): 20 failed and 10 passed.
  - Passed: the 7 baseline cases, the association control and the 2 library-input cases.
  - Failed, each at its own assertion:
    - 15 at `status 200 != 400`: wrong type ×10, restrictions ×2, dataset-for-collection, deleted inputs, invalid run request.
    - `invalid_batch_entry`: status, message and no-invocation passed on dev; failed at the history-exists assertion. Dev created the entry-1 history.
    - `invalid_step_parameter`: failed at the history-exists assertion.
    - landing `unknown`: failed at the history-exists assertion (dev 404s after creating the history).
    - landing `unclaimed`: 200 != 409.
    - landing `claimed_by_other_user`: 200 != 403.
- **Unit:** `PYTHONPATH=lib pytest test/unit/app/managers/test_landing.py`: 7 passed (identical to dev).
- **Lint:** ruff, black and isort clean on both test files and on the baseline-only intermediate version. Pre-commit hooks passed on each commit.

## Commits

Rebuilt from `origin/dev` `7e16f446410` (`git reset` + staged per commit; original authorship and messages reused):

1. `fde4e03dd8d` Baseline tests: 5 tests / 7 cases. Message drops "library dataset inputs".
2. `93206d4cdb6` Validate before creating histories. Source is identical to the old commit 2; tests as above.
3. `4b4c7d39b9a` Landing check. Source is identical; carries the `test_landing.py` API test and no unit-test change.

`git diff 3c9b3fbed60 4b4c7d39b9a -- lib/galaxy` is empty.
