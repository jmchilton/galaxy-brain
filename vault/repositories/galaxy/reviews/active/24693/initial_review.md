# PR #24693 initial review (default profile)

- Profile: default (`_shared/reviewers/default.md`)
- Model: Claude Opus 5.5
- Effort: medium
- Reviewed commit: `db8d06be733` (merge-base `018ebd2cf60`, base `release_26.2`)

## Verdict

Correct and safe to merge. No P1 or P2. Two minor P3s, neither blocks the fix.

## Findings

### P3 1: `verify_population` closure can't be reused, Selenium verifier still accepts failed collections

`lib/galaxy_test/selenium/framework.py::_verify_output_collection` is a second implementation of `verify_collection`, used by the Selenium tool-test path. It reads `get_history_collection_details` and checks only type, count and element tests. A failed empty collection with only `type` or empty `element_tests` still passes there, which is the false green this PR closes. Selenium's code is pre-existing and untouched, so it need not change here, but defining the check as a closure inside `verify_collection` means it can't be called from the sibling.

Suggested: move `verify_population` to a module-level function in `interactor.py`, a move of a few lines with no behavior change. Calling it from `_verify_output_collection` then takes one line, here or later. Replacing the Selenium implementation with `verify_collection` is a larger follow-up and doesn't belong on a release branch.

### P3 2: `populated_state_message` branch is untested

The PR description advertises reporting the population message, but no test passes `populated_state_message`, so `test_verify_collection_rejects_unpopulated_empty_collection` only covers the bare message. Dropping lines 1675-1676 of `interactor.py` wouldn't fail any test.

Suggested: add one case with exact-match assertion, in the style of the existing test (run from a scratch file against this head; it passes):

```python
def test_verify_collection_reports_population_message():
    output_def = TestCollectionOutputDef.from_dict({"name": "plots", "collection_type": "list"})
    collection = {
        "collection_type": "list",
        "elements": [],
        "populated_state": "failed",
        "populated_state_message": "Problem building datasets for collection.",
    }
    with pytest.raises(AssertionError) as exc_info:
        verify_collection(output_def, collection, lambda *a, **k: None)
    assert str(exc_info.value) == (
        "Output collection 'plots': populated state is 'failed', expected 'ok'. "
        "Problem building datasets for collection."
    )
```

## Checked, no finding

- **API shape matches the code's assumptions.** Both callers use the `element` view: `dataset_collections/{id}` (tool tests, `verify_output_collection`) and `histories/{id}/contents/dataset_collections/{id}` (`test_framework_workflows.py`). Top level gets `populated_state`, `populated_state_message` and `populated`. Nested objects get `populated` and `elements` from `dictify_element` (`collections_util.py:224`), and `populated_state` isn't exposed there (`DatasetCollection.dict_element_visible_keys`, `DCObject`). The code comment is accurate. Read from the code, not exercised against a live server by this PR's tests; the author scoped out new integration fixtures in the description.
- **Stricter key access doesn't break downstream callers.** The recursion now reads `element_type` on every element, not only those named in `element_tests`. Planemo, the only external caller checked (`planemo/test/_check_output.py`, `origin/master`), gets its dict from bioblend `show_dataset_collection` (`planemo/galaxy/activity.py:639`), which is the API shape above. Its own `attach_file_properties` already reads `element_type` on every element.
- **`element["object"]` can't be `None` in the recursion.** `DatasetCollectionElement.element_type` returns `dataset_collection` only when `child_collection` is set.
- **Expected-failure tool tests aren't affected.** A scan of `<test>` elements in `test/functional/tools` and `lib/galaxy/tools` found none with `<output_collection>` plus `expect_failure` or `expect_exit_code`. Those with `expect_test_failure` (`discover_sort_by.xml`, `expect_num_outputs.xml`) still fail as they expect.
- **Skipped jobs stay accepted.** Both the skip paths call `mark_as_populated` (`tools/actions/__init__.py:807`, `model_operations.py:174`), so `when: false` outputs pass.
- **No regressions from a `new` state race seen.** Tool framework (both modes), Workflow framework, Main tool, API and Unit CI jobs are green at this head. The check runs after `wait_for_job` in tool tests and after the workflow populator's default wait.
- **Red CI is unrelated.** Sampled first startup, Playwright and Integration Selenium logs fail on `Failed to restore cache entry` for `galaxy-static-*`. The macOS startup and second Playwright job logs weren't read.
- **Unit tests pass.** `test/unit/tool_util/test_verify.py` at this head: 89 passed, using a sibling worktree's venv with `PYTHONPATH=lib`. The description says 88; the difference wasn't investigated and doesn't matter.

## Notes for John (not findings)

- Nested failures report only `collection is not populated`, without the reason or `new` versus `failed`, because the API doesn't serialize these on nested objects. The description's "reporting the affected collection path and population message" holds for the message only at top level. Exposing it would be an API schema change, not appropriate on a release branch, so the current behavior is the right trade-off.
- This tightens `galaxy-tool-util` behavior for downstream tool tests (planemo, IUC). Only false greens should turn red, so it fits a bug fix.
- Related: #24407 ([26.1], open) is the server-side half, marking a discovered collection failed when its job errors before writing an element. This PR only catches collections the server has already marked unpopulated. Neither depends on the other to merge.
- The description says this "ports" the fix, but `origin/dev` has no `verify_population` and no linked source PR was found. It should reach `dev` by forward merge.
