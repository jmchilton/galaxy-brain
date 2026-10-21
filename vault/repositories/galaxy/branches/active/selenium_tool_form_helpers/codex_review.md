# Codex review (re-harden)

A fresh `codex exec -s read-only` review of `origin/dev...8c9765be8d3` returned 4 findings. I verified all 4 against the code, and all were fixed in `e3ba43550a3` by preparing each parameter's path just before it's set, instead of adding every repeat up front. That change is about +149/−129.

Nothing was left unacted. The fix resolves the three known limits in `implementation_rescope_debrief.md`: repeats in a non-default case, sections revealed mid-fill, and `_<digits>` names.

Remaining notes:
- Data parameters are never deferred.
- Inserting a repeat still needs `data-repeat-name`, which only 26.1+ clients render (this predates the fix).
- `sustainRepeats` forms rely on the early return when the field already exists.

<details>
<summary>Findings and fixes</summary>

1. **P1: Repeats in a conditional case that isn't selected yet.**
   - Problem: every repeat was added before any value was set, so the insert button wasn't mounted yet and the fill timed out before it switched the conditional.
   - Verdict: CONFIRMED on `async_conditional_no_default_nested_data`.
   - Fix: when an insert button is missing, the parameter fails, the existing deferral catches it, and the retry prepares the path again.
   - Test: E2E `test_tool_form_fill_adds_repeat_instances_in_the_conditional_case_it_selects`. Red under Playwright (timed out on the insert); green under both backends.
2. **P2: A section inside a newly added instance stays collapsed.**
   - Problem: the inner repeat's insert button stayed hidden.
   - Verdict: CONFIRMED.
   - Fix: sections are expanded again after each insert.
   - Test: fixture test `test_tool_form_fill_expands_a_section_an_added_instance_holds`, red then green on both backends.
3. **P2: Instances were detected through the fields inside them.**
   - Problem: an outer instance holding only an empty inner repeat was never seen.
   - Verdict: CONFIRMED.
   - Fix: instances are now counted by the repeat block's `${instance}_up` button, which exists since v24.0.
   - Test: fixture test `test_tool_form_fill_counts_instances_holding_no_field`, red then green on both backends.
4. **P2: Every `_N` segment was treated as a repeat instance.**
   - Problem: conditionals and sections with names like `inner_options_1` were misread.
   - Verdict: CONFIRMED (`conditional_name_digit_suffix.xml`).
   - Fix: a segment counts as a repeat only if its instances or insert button exist in the current scope.
   - Test: E2E `test_tool_form_fill_conditional_named_like_a_repeat_instance`. Red under Playwright; green under both backends.

Removed: the upfront repeat pass, `_add_repeat_instances`, `repeat_instance_counts`, `repeat_insert_scope` and the `repeat_instance_parameter` target. Added: `repeat_instance_candidates` and the `repeat_instance` target. The `nested_repeat.html` fixture was rewritten to the real FormRepeat/FormCard markup.

Tests:
- All branch E2E tests pass under Playwright, and the repeat, section and conditional ones under Selenium.
- Unit tests: 20 passed.
- `test/unit/selenium` passes once chromedriver is on PATH.

</details>
