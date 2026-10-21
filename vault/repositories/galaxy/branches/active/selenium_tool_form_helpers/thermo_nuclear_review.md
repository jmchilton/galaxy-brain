# Thermo-nuclear review (re-harden)

Reviewed `origin/dev...e3ba43550a3` fresh. I acted on the main finding: the fill machinery is about 250 lines with one concept and one navigation component, so it moved out of the 3.4k-line `navigates_galaxy.py` into `galaxy.selenium.tool_form_filler.ToolFormFiller`. It's a composed helper, like `RecordedClipboard`, not a mixin. I also untangled the fill path's branching. `NavigatesGalaxy` keeps `tool_form_fill`, `tool_form_set_parameter` and `tool_form_parameters` as its public API, because gxui's `verbs.py` calls all three. The branch now grows `navigates_galaxy.py` by 44 lines instead of 278. New head is `8f1617b0fd0`, two commits on top: `953f9421d24` (the move) and `8f1617b0fd0` (the cleanups, plus keeping `navigates_galaxy` importable without playwright).

Not acted on:
- **`tool_form_parameters(tool_id=None, job_id=None)`, with optional ids.** gxui's `_open_form` reads the open tool or rerun form from the URL and splats the result into this one entry point. Two methods would push that branching into the consumer.
- **The string dispatch in `set_parameter` / `_detect_param_type`.** This harness code moved verbatim from `framework.py`, and detection is order-dependent DOM probing. A dispatch dict or `Literal` would rename the branches without removing any.
- **Deferring data parameters.** They're never deferred. They're set after every value, so conditionals are already switched. Deferring them would change behavior, not structure.
- **Silently skipping deferred parameters that never appear.** This is dev's harness behavior. Tool tests list inputs from inactive conditional cases.
- **`{**data, **collections}` in `RunsToolTests._fill_tool_form`.** It keeps dev's order: datasets first, then collections.
- **`ToolFormFiller._wait_until` calls the navigator's private `_wait_on`.** No public zero-arg wait exists. `_wait_on_custom` is also private, and on Selenium it passes `driver`. I didn't copy `_wait_on`'s body.
- **`client/src/utils/navigation/schema.ts` lacks the new targets.** Nothing generates or checks it, and it already lacks dev's `section_header` and most `tool_form` targets.

Downstream note: on the gxui branches (`galaxy_ui_driver`, `galaxy_ui_driver_followups`), `test/unit/selenium/test_tool_form_fill.py` stubs `_expand_collapsed_sections` and `tool_form_set_parameter` on a fake form. It then calls `NavigatesGalaxy.tool_form_fill` unbound, which no longer works now that `ToolFormFiller(self)` reads `components`. That file was already broken against this branch. On restack, take this branch's version of the file. `verbs.py` calls only the three public methods, so it's unaffected.

<details>
<summary>Full review</summary>

## Findings

1. **The fill machinery should have its own home.** Acted on (`953f9421d24`).
   - `tool_form_fill` and its helpers grew to about 250 lines in `NavigatesGalaxy` across the fix rounds. They include `_prepare_parameter`, repeat counting and insertion, section expansion, collection mode, multiselect clearing, the data-selection assertion, type detection and five setters. All of them drive `components.tool_form` and nothing else, and no other code calls the private ones. On every gxui branch, only the three public methods are called from outside.
   - The draft-1 review rejected a mixin: it would need about a dozen abstract stubs, and a `NavigatesGalaxy` alias can't type a mixin that `NavigatesGalaxy` itself inherits. Composition has neither problem. `ToolFormFiller(navigator)` imports `NavigatesGalaxy` only under `TYPE_CHECKING`, the same pattern as `PlaywrightElement`'s back-reference. `NavigatesGalaxy.capture_clipboard` is the existing precedent for a thin public method over a helper object in its own module.
   - The new module isn't on the relaxed mypy list, so its signatures are now fully typed: `_button_is_pressed(button: WebElementProtocol)`, `list[Any]` and the `None` returns.
   - Runtime import cycle: the module must not import `navigates_galaxy`, so it can't reuse `_exception_indicates_playwright_timeout` from there.
     - My first cut imported `playwright.sync_api.TimeoutError` at the top of the filler. That made `import galaxy.selenium.navigates_galaxy` load playwright, which dev avoids with the classifier's lazy import. I confirmed it by blocking `playwright` in `sys.modules`: dev imports, the first cut doesn't.
     - Fix: the classifier moved unchanged into `has_driver.py`, renamed `exception_indicates_playwright_timeout`. It now sits beside `exception_indicates_stale_element` and the other classifiers, and both modules import it. With playwright blocked, `navigates_galaxy` imports again.
   - `FixturePage.sleep_for` still takes effect, because the filler sleeps through the navigator.
2. **`_prepare_parameter`'s silent `continue`.** Acted on (`e3648851161`).
   - A `continue` under `if not (buttons := insert.all())` skipped `scope = …`. That skip is how a conditional named `opts_1` avoids becoming an insert scope, but nothing said so.
   - It is now `_add_repeat_instances(repeat_path, index, scope) -> bool`. The function returns whether the form shows that repeat in that scope, and the docstring names both cases where it doesn't. The insert target is built only when instances are missing.
3. **`isinstance(value, int)` three times in the data loop, plus a lazy `collection_hids = None` local.** Acted on.
   - The data loop now dispatches once. A hid goes to `_select_data_by_hid`, which handles collection mode and the selection assertion. A label goes to `_select_data`, which clears multiselect tags and sets the value.
   - Collection hids are a `cached_property`, because the filler lives for one fill.
   - `_is_multi_data_param` and `_assert_data_selected` were single-use, so they were folded into their only callers.
4. **A form-ready wait inside the per-parameter path.** Acted on.
   - `_expand_collapsed_sections` waited on `tool_version` on every parameter and after every insert. It now waits once per fill, after the early return.
   - The early return is load-bearing again: an empty fill doesn't wait on a form.
5. **The section click cap raised `AssertionError`.** Acted on.
   - `_exception_indicates_parameter_not_shown` classifies `AssertionError` as "not shown". So the first pass deferred a stuck section as a missing parameter, and the error only resurfaced from the retry pass.
   - It now raises `RuntimeError` straight away. This is a small behavior change: the same error surfaces on the first pass instead of the retry.
6. **Duplicate setters.** Acted on: `_set_color_value` and `_set_text_value` were the same two lines, and are now one `_set_element_value(target, value)`.
7. **`tool_form_parameters` with optional ids.** Not acted on; see above.
8. **String dispatch in `set_parameter`.** Not acted on; see above.
9. **File size.** `navigates_galaxy.py` was already 3441 lines on dev, so the 1k rule doesn't apply. Growth is now +44 lines: the imports, `tool_form_parameters`, the two delegating methods and the `select_set_value` exact match, less the classifier that moved to `has_driver.py`. The fill code lives in a 261-line module. `tool_form.py` stays pure and stdlib-only at 103 lines. `framework.py` shrinks by about 180 lines.
10. **Boundaries.** `lib/galaxy/selenium` imports nothing from `galaxy_test`. The new module imports only `selenium` and sibling `galaxy.selenium` modules, and playwright stays a lazy import, as on dev.
11. **Navigation targets.** The xpath targets for `repeat_insert_top_level`, `repeat_insert_in_instance`, `repeat_instance`, `section_header_collapsed` and `section_header_content` are long, but each has a comment saying why it's shaped that way. No raw selectors remain in the fill code except `section_header_content.selector`, used for a relative find, which follows `_detect_param_type`'s existing precedent.
12. **`select_set_value` exact match (7f).** No change. It's a small, commented fallback, and the fixture test pins it.

## Tests

- Import check: with `playwright` blocked in `sys.modules`, `galaxy.selenium.navigates_galaxy` imports at the new head (and at `e3ba43550a3`).
- Unit: `test_tool_form_parameters.py`, `test_tool_form_fill.py` and `test_select_set_value.py` give 20 passed, after each of the two commits. The full `test/unit/selenium` gives 546 passed and 1 skipped.
- E2E, headless Playwright against Vite 5173, one at a time, all passing:
  - In `test_tool_form.py`: `fill_by_parameter_path`, `parameters_match_form`, `parameters_for_rerun`, `fill_maps_over_collection`, `fill_adds_repeat_instances_in_conditional`, `..._in_the_conditional_case_it_selects`, `fill_conditional_named_like_a_repeat_instance` and `fill_expands_only_collapsed_sections`.
  - In `test_workflow_editor.py`: `test_tool_form_fill_on_editor_step`.
- After the import fix: the three unit files again gave 20 passed, and `parameters_match_form` plus the conditional-case repeat test passed again under Playwright.
- E2E, Selenium, all passing: both repeat tests, the conditional-name test, the section test and the map-over test.
- Pre-commit with the `.sample` config is clean. mypy from `lib/` on `tool_form_filler.py` and `navigates_galaxy.py` reports only the 7 errors in `galaxy/util` that are already on dev.
- The server belongs to another session, and I didn't stop or restart it.

</details>
