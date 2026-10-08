# Test challenge debrief: issue_23980_static_restriction_default

Commit `d200b2992ce` on top of `b7e68efcde9` (pushed with the branch).

## `test_parameter_input_static_restrictions_select_default` (unit, test/unit/workflows/test_modules.py): dropped

- The two plain-list cases (single `b`, multiple `[b, c]`) check the same thing as the API test. The API test checks it at the layer the client actually reads: the `download?style=run` payload, with `value` and per-option `selected`.
- The unit test asserted on `get_initial_value` and `static_options`. Its expected flags were recomputed from the restrictions with a comprehension, which comes close to re-implementing the code under test.
- The only unique coverage was dict-form `{value, label}` restrictions. gxformat2 supports these (`synthetic-text-restrictions-options.gxwf.yml`), so they're easy to test at the API layer. Moved there (below).
- Speed alone isn't a reason to keep a duplicate.

## `test_value_restriction_static_default_selected` (API): kept, extended

- Added a third input, `labeled_text`, with restrictions `[{value: a, label: A}, {value: b, label: B}]` and `default: b`. Asserts `value == "b"` and `options == [["A","a",False],["B","b",True]]`. This also checks that labels and values reach the payload separately.
- Passes on the fix (36s).
- Red check: ran it against `HEAD~1`'s `modules.py` (temporary file swap, no stash, then restored). It fails at `assert 'a' == 'b'` on the single input. The dict case sits behind that first assertion, so it wasn't red-checked on its own. It runs through the same restriction-options loop.

## E2E `test_execution_with_text_default_value_and_static_restrictions` (lib/galaxy_test/selenium/test_workflow_run.py): added, not run

- Warranted: the issue says the UI effect was inferred from client code and never confirmed in a browser. The bug is user-visible: the form shows the wrong value, and the wrong value gets submitted. Client behavior is involved too, since `FormSelect` falls back to the first option.
- Mirrors the existing `test_execution_with_text_default_value_connected_to_restricted_select`. It swaps `restrictOnConnections` for static dict-form restrictions (`--ex1/Ex1`, `ex2/Ex2`, `--ex3/Ex3`), `default: ex2`, connected to `multi_select`. It asserts the select shows `Ex2`, submits, and checks the output is `ex2`.
- Dropped `optional: true` so the required-select "fill with first option" path is the one exercised. Static restrictions take precedence here because `restricted_inputs` stays False without `restrictOnConnections`.
- Uses the existing `workflow_run.input_select_field` selector from navigation.yml. No new selectors.
- Only checked with py_compile, ruff, black and isort. CI will run it.

## Not done

- No E2E for the multiple (`[text]`, default `[b, c]`) case. Multiselect chip text is unpredictable, and no existing E2E submits a multiple text input. An unrun test there would likely fail CI on details unrelated to the fix. The API test covers that payload.
- `_is_default_option` is also used by the restrictOnConnections path. That path is still covered by the existing E2E test above and by API tests. No new test was added for it.

## Results

- `test/unit/workflows/test_modules.py`: 87 passed.
- API test: passes on the fix, fails on the pre-fix code.
- ruff, black and isort are clean, and the pre-commit hooks passed.
