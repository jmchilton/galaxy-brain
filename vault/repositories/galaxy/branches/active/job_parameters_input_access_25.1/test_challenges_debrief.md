# Test challenges debrief

Round 2, done fresh. Head `2c31c23611f` (was `d3f0af8ae2e`). Two fixups autosquashed; no checks removed or weakened.

## Changes

- **New baseline test** `test_parameters_display_dce_input_beside_restricted_sibling` (into baseline `dcb4ffa7369`). Mutation check: changing `can_access_data_input`'s DCE branch from `item.child_collection or item.collection` to `item.collection` left every existing test green, because each nested-DCE test restricted a dataset inside element[0]'s own pair, which also restricts the parent list. The new test restricts a dataset in the *sibling* pair of a two-pair `list:paired` (`example_list_of_pairs`), maps over pairs, and checks a third party still sees element[0]'s identifier. It passes on 25.1, where everyone sees names, and on the branch. Under the mutation it is the only failure.
  - It sits after the helpers, so the fixup applies cleanly to the baseline commit. It inlines `make_dataset_public_raw` because `_make_dataset_public` arrives in a later commit.
- **Markdown unit fixture tightened** (into `49304fb7746`). The inaccessible HDA value was `{"src","id","hid": None,"name": None}`, which is the API-serialized shape. `handle_job_parameters` calls `summarize_job_parameters` directly, so the real value is `{"src": "hda", "id": 3}` with no `hid`/`name` keys. Fixed.

## Kept as-is

- **`can_access_data_input` unit test:** none added. All four branches are pinned end to end: HDA, HDCA, leaf DCE (`dce_input_in_inaccessible_collection`), and collection DCE plus its child-collection preference (new test). A `test_galaxy_mapping.py` test would duplicate them.
- **API helpers:**
  - `_rerun_option` covers the repeated `build_for_rerun` GET.
  - `_data_parameter_values` covers the repeated `parameters_display` GET.
  - `_run_for_parameters_display` and `_make_dataset_public` cover the repeated populator sequences.
  - Inline map-over dicts follow the file's existing convention.
  - Renaming `_run_for_parameters_display` (it now also serves rerun tests) was skipped; it would cause conflicts across several commits.
- **Markdown unit test** stays at the handler level, matching the neighboring `test_job_parameters`. The basic-markdown export has no cheap API surface.
- **E2E:** none. Client rendering is unchanged; the form placeholder reuses the existing `hid: -1` option path. The contract is fully visible at the API layer.

## Red/green (fresh)

- **Run A:** all impl files reverted to `origin/release_25.1` (`jobs.py`, `markdown_util.py`, `security.py`, `basic.py`, `actions/__init__.py`, `schema.py`).
  - Passing: 7 baseline tests and the pre-existing `test_parameters_display`.
  - Failing: all 9 new-behavior API tests, each at its final `==`/`err_msg` assert.
  - The markdown test also fails at its assertion: the base handler leaves the directive unexpanded.
- **Run B:** only `basic.py` and `actions/__init__.py` reverted. The 3 `rerun_form_inaccessible_*` tests and `tool_run_inaccessible_hda_input_error` fail; everything else passes.
- **Run C:** only `jobs.py` reverted. The 5 `parameters_display` inaccessible tests fail; everything else passes.
- **Final:**
  - API `-k "parameters_display or rerun or tool_run_inaccessible or dce_submission"`: 23 passed.
  - Unit tests (`test_markdown_export.py` + `test/unit/app/tools/`): 373 passed.
  - Pinned black/ruff/isort/flake8 clean.

Status: OK.
