# Initial implementation debrief

Fixes [#24200](https://github.com/galaxyproject/galaxy/issues/24200) on base `release_26.2`. Head `aa9c800d947`.

## What changed
- `InputParameterModule` (`lib/galaxy/workflow/modules.py`) splits stored validators three ways. Non-negated regex rows go to the form (text, directory_uri). The first plain in_range goes to the min/max fields (integer, float). Everything else goes to a new hidden `extra_validators` form field (JSON), one per parameter-type case. `_parse_state_into_dict` merges the hidden ones back, so import, export, runtime and editor re-save all see the declared validators. Changing the parameter type in the editor drops them.
- "Form-shaped" is judged against the validator models' field defaults, not hand-written key lists.
- `save_to_step` builds the validators the way runtime does (`parse_dict_validators(trusted=False)` + `to_validators`). Invalid or unsafe ones give a 400 naming the input. Loading stored workflows does not check, so existing ones still open.
- `InRangeParameterValidatorModel` rejects `min > max`. The runtime validator already asserted this; tools now fail at parse/lint time instead of at parameter construction.
- Empty min/max form fields no longer store a no-op `in_range {min: null, max: null}`.

## Tests
- Baseline commit: 7 unit tests pinning the regex and range round trip, plus loading of a stored `min > max` range (pass on base).
- 30+ unit tests in `test/unit/workflows/test_parameter_input_validators.py`:
  - the issue's repros, plus exclusive bounds;
  - import, store and export of the declared validators;
  - editor re-save keeps hidden validators, and edits to shown ones apply;
  - a type change drops hidden validators;
  - invalid ones are rejected (in_range and length `min > max`, a bad type, unsafe hidden).
- An invalid XML validator sample with `min > max`.
- API: import a `.ga` with a negated regex, download it, check the invocation request rejects `bad1` with 400 "no bad" and accepts `good`; `min > max` import gives a 400. Both API tests are red on base and green on the branch.
- Related unit suites (workflows, tool linters, yaml params, parameter validation, specification): 532 passed.

## Decisions / caveats
- Order: shown validators (range, then regex rows) come before hidden ones. Relative order within each group is kept.
- Hidden validators are not visible or editable in the editor, and an invalid one blocks re-save until fixed by re-import or a type change.
- Not done: validator/parameter-type compatibility checks. The linter map lacks workflow types.
- Not done: #24199 (run-form numeric bounds).
- Side finding: `POST /api/workflows/upload` with a `.ga` missing `annotation` returns 500 (`KeyError` in `build_workflow_from_raw_description`). Not fixed here.
