Run via Claude Opus 5.5 at high effort.

Added one refactor-only commit after "Baseline tests" that moves the static option string conversions (`InputParameterModule._parameter_option_def_to_tool_form_str` and the nested `_string_to_parameter_def_option`) to module-level `parameter_options_to_form_str` / `form_str_to_parameter_options` in `workflow_parameter_input_definitions.py`, keeping the base branch's lossy behavior. The fix then lands on top.

## Refactor commit

`5da10b2ad59` Move workflow static option string conversions to module-level helpers

- `modules.py`: imports the two helpers, calls them at the three former call sites (`get_inputs` prefill, `_parse_state_into_dict` encode, `_parse_state_into_dict` parse), and deletes the method and nested function. Help text is unchanged.
- `workflow_parameter_input_definitions.py`: appends the two helpers with their base bodies verbatim, plus type hints and short docstrings. No escaping, no `STATIC_OPTIONS_FORM_HELP`.
- Baseline tests pass on it (13 passed for `-k "static or restrict"`). ruff, black, isort and mypy are clean on both files.

## Why

Before, the fix commit both moved the code and rewrote it. Now the fix commit (`40fb8e38028`) touches `modules.py` only for the help text and the `STATIC_OPTIONS_FORM_HELP` import. Its change to `workflow_parameter_input_definitions.py` replaces the old helper bodies in place, so a reviewer can compare old and new parsing side by side. The refactor is also a small move-only commit that is easy to review.

I considered splitting off more refactors and decided against it. The precedence change (`15f4bb3b9f2`) changes behavior. The private helpers (`_option_chars`, `_split_option_chars`, `_strip_option_chars`) exist only because of escaping, so they belong with the fix.

## History

Old head: `dd37cd8c4673c169f0fccd1d39b2fe902513a001`. I rebuilt the four later commits with `git commit-tree`. Each one reuses its original tree, message and author on top of the refactor commit. The final tree is identical to the old head (`git diff dd37cd8c467 HEAD --quiet` passes). The branch is not pushed.

```
4333ba9e1a6 Share one escape rule between static option encoding and parsing
15f4bb3b9f2 Open text inputs with restrictions and suggestions as restricted
b3c58fb0364 Only escape backslashes the editor string would misread
40fb8e38028 Keep workflow text input restrictions intact through the editor string
5da10b2ad59 Move workflow static option string conversions to module-level helpers
ba68c159498 Baseline tests for workflow text input static options round trip
```

Per-commit `test/unit/workflows/test_modules.py -k "static or restrict"`: 5da10b2 13 passed; 40fb8e3 38 passed; b3c58fb, 15f4bb3, 4333ba9 41 passed each.
