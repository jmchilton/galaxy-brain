# Test challenges review — PR #25042

Profile: gx_test_challenger · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: c29193e2b0fa39e9d76a09c88c8ea93a88615e11

Details: [test_challenges_debrief.md](test_challenges_debrief.md)

Overall: tests are solid — real params in unit test, E2E covers user path, removed status-only test superseded by stronger assertions.

## P2 1 — No API test for unchanged scalar default surviving editor save
Primary regression (scalar tool-step default kept when form untouched) is only covered by Selenium. API tests cover data, connected and subworkflow defaults, and the data test asserts a *changed* scalar is dropped, but none asserts an untouched scalar `in` default survives. Add e.g. `test_update_from_editor_keeps_tool_step_input_default`: upload `random_lines1` (or `gx_int`) with `num_lines: default: 2`, `_save_from_editor` with the unmodified editor download, assert `in == {"num_lines": {"default": 2}}`.

## P3 1 — `same_form_value` parametrized test mostly restates implementation
Cases like `(7, 7, True)` / `(3, 7, False)` test `==`. Drop it, or keep only the empty-value equivalence cases (the non-obvious behavior).
