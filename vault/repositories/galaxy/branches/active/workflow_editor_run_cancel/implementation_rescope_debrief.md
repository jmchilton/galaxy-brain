# Rescope debrief — workflow_editor_run_cancel (scope B)

**One decision needs John's OK:** `d99761d552f` corrects a fixture key, `WORKFLOW_WITH_IMAGES_IN_REPORT_TEST_DATA`: `image_input_1` -> `image_input`.
- The workflow's only input is `image_input`. The API test that runs the same workflow, `test_workflow_invocation_report_keeps_inline_output_labels`, keys its data `image_input`. Only the selenium test imports this fixture.
- The key has never matched since it was added in `8afb1043966`. The test passed only because the old helper dropped `File` data and the form preselected the one png.
- With the helper fix, `test_execution_with_images_in_report` failed (timeout on `[step-label='image_input_1'] .multiselect`) until the key was corrected.
- The fix is a separate commit that can be dropped. If it's dropped, that test fails loudly instead of passing by accident.

## Changes

New commits on top of `e858d2a07d8` (the original scope is preserved as `workflow_editor_run_cancel_alt_original_scope`):
- `d99761d552f` **Match image input label in WORKFLOW_WITH_IMAGES_IN_REPORT_TEST_DATA**. Placed first because it stays green on the old helper, which ignores `File` data, so every commit bisects green.
- `f1573ef71fd` **Select File inputs in workflow_run_setup_inputs**
  - `framework.py`: builds the returned dict from `load_data_dict`'s `label_map`. Only `src: hda/hdca` entries are kept, returned as `{src, id, hid}`. Raw scalars are skipped.
  - `navigates_galaxy.py`: `value["hid"]` replaces `value.pop("hid")`, so the helper no longer mutates its argument.
  - `test_execution_with_multiple_integer_parameter`: adds a newer tabular decoy after setup, then asserts the invocation's input is not the decoy and is the setup dataset.

## Red / green

The test was strengthened first and run on the pre-fix helper under Playwright.
- **Red:** `AssertionError: run form kept the preselected newest dataset` (input id equalled the decoy id).
- **Green** after the fix: passed.

## Tests run (one at a time, Vite 5173, this worktree's Galaxy)

Playwright (headless), final code. All passed:
- `test_execution_with_multiple_integer_parameter`
- `test_execution_with_custom_invocation_report`
- `test_execution_with_images_in_report`. Failed before the fixture key fix, as described above.
- `test_execution_with_multiple_inputs`
- `test_execution_with_rules`
- `test_execution_with_null_optional_select_from_data`
- `test_run_from_editor_and_cancel`

Selenium (chromedriver), both passed:
- `test_execution_with_custom_invocation_report`, the first real use of the expanded-form `input_data_div` path with `File` inputs and a list.
- `test_execution_with_multiple_integer_parameter`, which covers the simplified path.

black, ruff, flake8 and pre-commit pass. `mypy` reports no errors in `framework.py`.

## Hid prefix (`"1: "` vs `"11: "`)

It didn't bite. Every affected test uses `@managed_history`, and its setup creates at most about 4 items (hids 1-4). Noted, not fixed.

## Deferred, unchanged

- The shared form-mode helper (scope C).
- The canvas wait in `workflow_index_open_with_name` (scope D).
- The multiselect left open by `select_set_value`.
