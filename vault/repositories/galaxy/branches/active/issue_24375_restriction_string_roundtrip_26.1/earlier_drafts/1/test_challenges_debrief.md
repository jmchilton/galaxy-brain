Run via Claude Opus at high effort.

# Test challenges debrief

I kept all the tests and changed one thing. Two parametrized round-trip cases for empty values passed without the fix, so they moved into the "Baseline tests" commit. No test was dropped or rewritten at another layer, and no E2E test was added.

## Changes

- **Moved to baseline.** `test_text_input_static_options_round_trip` cases `["", "--cis-only", "--trans-only"]` and `[{"value": "", "label": "None"}, {"value": "a", "label": ""}]` pass on `release_26.1`. The old encoder joined `""` as an empty entry and the old parser kept empty entries. They now pin that behavior in the baseline commit. They guard the fix's new rule that a stray comma is dropped and a lone `:` is the empty value. History was rebuilt so the baseline commit stays first: see the commit list below.

## Red/green check

I restored `lib/galaxy/workflow/modules.py` from `upstream/release_26.1`, kept the new helpers so imports resolve, and ran `-k static_options`. Every non-baseline module-level test failed at its own assertion. After the move, the failures are 4 `normalized_round_trip`, `from_tool_form_escapes`, `editor_string_escapes` and 8 `round_trip` cases (cases 2 to 5 for both restrictions and suggestions). All baseline tests passed.

`test_static_options_form_parsing` and `test_static_options_form_str_round_trips_special_characters` test the new pure helpers directly. Against true base they fail at import, because the helpers are new. That is the expected cost of extracting the parser into testable functions, and the module-level tests above give the red signal at an assertion.

The API test `test_text_input_static_restrictions_survive_download` fails on base by reasoning: `"a:b"` reaches the old parser as `a:b` and comes back as `{"value": "a", "label": "b"}`. The initial implementation debrief also records that it failed on base. It passes on the branch (run in this pass).

## Challenges, test by test

- **`test_static_options_form_parsing`.** Kept. It's a table of inputs and outputs for a pure function with no mocks, and it is the clearest specification of the field syntax (stray commas, lone `:`, escapes, kept backslashes, first-colon split, trimming). These cases can't be reached cheaply through the API.
- **`test_static_options_form_str_round_trips_special_characters`.** Kept. It checks the encoder/parser property exhaustively over all strings of up to 4 characters from `a\,: `, which is how the over-escaping bug fixed in `c3bf15ffc76` would have shown up. It runs fast.
- **`test_text_input_static_options_normalized_round_trip`.** Kept. It covers label-less dicts, non-text entries, `None`, and empty value with empty label through the real step-load and export path. These inputs used to raise. It's behavior, not implementation.
- **`test_text_input_static_options_editor_string_escapes`.** Kept. The encoded string is what the user sees in the editor field, so its exact form is user-facing. It pins minimal escaping (`C\data` displays as typed).
- **`test_text_input_static_options_from_tool_form_escapes`.** Kept. It's the only red test for the save path (tool form to step). It overlaps the parser table in content but not in wiring.
- **`test_text_input_static_options_round_trip`.** Kept. The API test covers comma, colon and `""` for restrictions only. The unit test adds suggestions, backslashes and edge whitespace at the module level, so it isn't redundant.
- **Mocks.** The only fixture is the existing `MockTrans` utility, and `__text_options_step_from_tool_form` drives the real `populate_state`/`recover_state`/`save_to_step` path. No `SimpleNamespace` or ad hoc mocks, and nothing to restructure. The design change that made unit tests easy (module-level helpers next to `validators_to_form`) already happened in the implementation.
- **API test helpers.** It uses `workflow_populator.upload_yaml_workflow`, `create_workflow` and the existing `_download_workflow`. No raw HTTP calls are repeated.

## E2E

None added. The editor sends the field as an opaque string, and all parsing and encoding is server-side. The API test covers the server round trip through the same `from_workflow_step` → editor form state → `get_export_state` path the editor uses. A Selenium test would type the same string into a text field and add only the help text, which is static.

## Commits

History was rebuilt locally and not pushed. The final tree is identical to the old head `c3bf15ffc76`.

- `948ff7e7f24` Baseline tests (was `af039d3bfee`), now with the two empty-value cases. On base code, 12 `static_options` tests pass.
- `93f3625a14f` Fix (was `0f105c6e016`).
- `13c2282e38c` Minimal backslash escaping (was `c3bf15ffc76`).

## Results

- Unit, branch head: 40 passed (`-k static_options`).
- Unit, base `modules.py`: 14 failed (the non-baseline module-level tests listed above), and the rest passed.
- API `test_text_input_static_restrictions_survive_download`, branch head: 1 passed.
