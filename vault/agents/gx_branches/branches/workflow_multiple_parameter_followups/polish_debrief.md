# workflow_multiple_parameter_followups — polish debrief

Polished 2026-10-03, from `e3ac8d1819c` to `c4198bc1891`, pushed to the `jmchilton` fork. No PR opened.

## CI

Fork CI on `e3ac8d1819c` was all queued at the start of polishing, with no failures. Earlier runs at `7fdd7e202b3` and `b80cfbbcd36` were cancelled by later pushes. CI on `c4198bc1891` hasn't been checked yet.

## Checklist (GENERAL + WORKFLOW_RELATED)

The first pass failed **"What does the user see when it fails?"**. `b80cfbbcd36` claimed "a parameter error, not a 500", but the run form still returned a 500. `ParameterValueError` is a plain `ValueError`, and `_workflow_to_dict_run` only catches `ToolMissingException`. Confirmed red with a new API test (`Uncaught exception in exposed API method`).

- John's call: map it to 400 on the run path, without `log.error`, since it's a user error and not an admin one.
- Fix (`978938028c8`): `_workflow_to_dict_run` catches `ParameterValueError` and raises `RequestParameterInvalidException` with "Workflow step '<label>' cannot be run: <suffix>".
- Literal tests strengthened in the same commit:
  - The doctest is now a `to_json` → `from_json` round trip. It raises with the old `to_json`, which I checked by hand.
  - The unit tests assert the editor and runtime messages instead of only an error key or exception class.

The re-run on the final head passed every item except the human-read one, which is left for John.

## Strengthening round

Tasks applied:

- **New API tests** (`643c03f294a`), with base results from swapping `lib/galaxy/` to `f763f6cf2ab`:
  - `test_run_form_multiple_integer_list_default`: red on base, `'[1, 2]' == [1, 2]`. It's a real "before" for the run form, and it replaced the editor-reopen table row, which can't happen on base.
  - `test_run_form_invalid_default_on_single_integer_parameter` (`[1, 2]` and `x`): 500 on base.
  - `test_run_multiple_integer_list_default_through_subworkflow`: passes on base, which backs the two-way-door risk claim that runtime already worked.
- **Cleared-rows unit test** (`c4198bc1891`): a `null` default gets the editor error "an integer or workflow parameter is required".
- **Description fixes:**
  - The scope line was wrong for the toggle-off row and for the 400.
  - "On every save" became "when validated".
  - "Each test failed before its fix" narrowed to 🔴 markers on tests verified red at the bug's assertion. The helper-based unit tests would fail with an `AttributeError` on base, so they're unmarked.
  - Dropped the unlinked "review findings 1 and 2".

Not done (left over):

- **`_workflow_to_dict_preview` 400 mapping.** Preview doesn't call `compute_runtime_state`, so it isn't clear the 500 reaches it. Dropped from the description instead of adding unproven code.
- **Subworkflow connection end to end.** Only `get_all_inputs` is unit tested. A `build_module` API assertion or a Selenium connection test would close it.
- **Selenium test not rerun after polishing.** The polish commits don't touch the editor path; CI covers it.
- **Pitch nuance:** the 400 applies to any step type, and the first bad step fails the whole form. This is noted in Risk Details.

## Questions for John

- The opener "Follow-up to 🔀 #23802 - …" isn't on the controlled list, because there's no issue to cite. Is it OK?
- Multiple **text** defaults are still single-valued. Fix them here or in a later PR?
- Keep the run-form 400 (which also covers single-valued and tool-step values) in this PR, or split it out?
- The 400 message suffix "the attribute 'value' must be an integer" is parameter-level jargon. Reword it to mention "default"?
