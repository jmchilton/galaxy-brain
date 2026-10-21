# Thermo-nuclear review

Reviewed `origin/dev...7ba26e123c7` (merge base `93b3c85e532`). I acted on the main structural finding: the pure build-model code moved out of `navigates_galaxy.py` into a new browserless module, `galaxy.selenium.tool_form`, and repeat-path counting became a pure function there. The DOM fill code stays on `NavigatesGalaxy`. I checked one suspected correctness bug, int-hid substring selection, and it did not reproduce. New head is `d4a4ea5d0db`, one commit on top: `Move tool form build-model parsing into galaxy.selenium.tool_form`.

Not acted on:
- **Mixin for the DOM fill code.** It calls about 12 `NavigatesGalaxy` members: `components`, `sleep_for`, `wait_types`, `_wait_on`, `tool_set_value`, `execute_script`, `set_element_value`, `api_get`, `current_history_id`, and the `_set_*` and detect helpers.
  - dev has two precedents in `galaxy.selenium`. `WaitMethodsMixin` declares abstract stubs for what it needs. The other precedent is standalone browserless modules (`axe_results`, `smart_components`).
  - The `TYPE_CHECKING: Base = NavigatesGalaxy` alias from the sibling `upload_activity_helpers.py` branch isn't on dev. It also can't type a mixin that `NavigatesGalaxy` itself inherits, because that's cyclic.
  - A mixin would therefore need a dozen stubs or a Protocol. The methods also sit beside the existing `tool_open`, `tool_set_value`, `tool_form_execute` and `tool_form_select_data`. I judged the indirection not worth it.
- **`tool_form_parameters(tool_id=None, job_id=None)`, with optional ids and a `ValueError`.** Splitting it into two methods would make the boundary explicit. But gxui's `tool-describe` and `tool-fill` verbs call `ctx.tool_form_parameters(**_open_form(ctx))`, where `_open_form` reads the open tool or rerun form from the URL. The single entry point suits that consumer.
- **Collapsing the `data` and `collections` dicts in `RunsToolTests._fill_tool_form`.** Merging them would interleave collection selections with dataset selections in input order. Dev selects datasets first, then collections, and the current `{**data, **collections}` keeps that order.
- **`tool_form_set_parameter`'s string dispatch on `_detect_param_type`.** This is moved verbatim from `framework.py`, so the move stays easy to review. It isn't new branching.
- **Deferred parameters that never appear are skipped silently.** This is dev behavior. Harness tool tests rely on it for inputs in an inactive conditional case.
- **Nested repeats.** `repeat_instance_counts` counts only the outermost repeat in a path such as `outer_0|inner_2|x`. This is unchanged from dev's `_parse_repeat_key`, and the new unit test doesn't enshrine it.

Downstream note: with `no_implicit_reexport`, gxui's `from galaxy.selenium.navigates_galaxy import ToolFormParameter` still works at runtime, but mypy will flag it. On restack, gxui should import from `galaxy.selenium.tool_form`. `galaxy_ui_driver` and `galaxy_ui_driver_followups` also still carry `test/unit/selenium/test_tool_form_fill.py`, which calls the removed `NavigatesGalaxy._parse_repeat_key` and would fail with an `AttributeError`. Drop that file, as this branch did, or use `tool_form.repeat_instance_counts`. Neither gxui branch has a `galaxy/selenium/tool_form` module, so the new name doesn't collide.

<details>
<summary>Full review</summary>

## Findings

1. **Pure parsing code lived in a 3.4k-line browser mixin.** Acted on.
   - `ToolFormParameter`, `tool_form_parameters_from_build`, `_tool_form_options_and_value` and `_flatten_options` (about 80 lines) were module-level functions in `navigates_galaxy.py`. They have no browser dependency.
   - `test_tool_form_parameters.py` imported the whole Selenium/Playwright module to test them.
   - Fix: moved them to `lib/galaxy/selenium/tool_form.py`, which imports only stdlib. It meets the default strict mypy settings, with no relaxed `mypy.ini` entry. `_flatten_options` now takes `list[Any]` instead of a bare `list`.
   - The package ships it through `packages/selenium/src/galaxy/selenium`, a symlink to `lib/galaxy/selenium`, and `packages.find`.
2. **Repeat counting was inline in `tool_form_fill`, via a `_parse_repeat_key` staticmethod.** Acted on.
   - The staticmethod returned an untyped 3-tuple whose third element was never used. It also needed `import re` in `navigates_galaxy.py`.
   - Fix: replaced with the pure `repeat_instance_counts(paths) -> dict[str, int]`, with a unit test.
   - `tool_form_fill` lost six lines and the staticmethod.
3. **The data-option branch in `_tool_form_options_and_value` was a nested closure inside a type switch.** Acted on: split out into `_data_options_and_value(options, pinned, value)`.
4. **`navigates_galaxy.py` growth.** dev has 3441 lines. Growth went from +289 at `7ba26e123c7` to +205 now. The file was already far over 1k lines, so the threshold rule doesn't apply. The remaining growth is the DOM fill code moved out of `framework.py`, which went from 1712 to 1535 lines. No duplication remains in `framework.py`: `_fill_tool_form` only translates test-definition inputs into a `tool_form_fill` call.
5. **Mixin for the DOM fill code.** Not acted on; see above.
6. **Optional `tool_id`/`job_id` pair.** Not acted on; see above.
7. **Suspected bug: int hids select by substring.** Checked; not a bug.
   - `tool_form_fill(data={k: 3})` types `"3: "` into the filter, and `pagination.sort_by_hid` lists the newest hids first, so `"13: …"` could have matched first.
   - Red attempt: a throwaway E2E made 13 datasets, filled `cat1` with `input1=3`, and asserted that the output was `dataset 3`. It passed under Playwright, so the bug didn't reproduce. I didn't trace why the filter avoids `13: …`. Because the test wasn't red, I didn't keep it.
8. **`select_set_value` exact-match fallback (7f) and the `_Page` `__getattr__` shim in `test_select_set_value.py`.** Reviewed; no change.
   - The shim is test-only and binds one unbound `NavigatesGalaxy` method to the existing driver test impls. A full `NavigatesGalaxy` needs a navigation root and a Galaxy server.
9. **Boundary checks.**
   - `lib/galaxy/selenium` adds no `galaxy_test` imports. The new module imports only `re` and `typing`.
   - `navigates_galaxy.py` dropped `import re`. Its new imports are still `urllib.parse` and `selenium`, both stdlib or declared.

## Tests

- `pytest test/unit/selenium/test_tool_form_parameters.py test/unit/selenium/test_select_set_value.py`: 10 passed. That's 7 earlier cases, 1 new repeat-count case, and 2 `select_set_value` cases, one per backend.
- mypy, run from `lib/`:
  - `galaxy/selenium/navigates_galaxy.py` has the same 7 errors as dev, all in `galaxy/util`, which this branch doesn't touch.
  - `galaxy/selenium/tool_form.py` is clean.
- Pre-commit with `.pre-commit-config.yaml.sample` (black, ruff, flake8, prettier, and the rest): clean.
- E2E, headless Playwright, run one at a time against Vite 5173. The server belongs to another session and wasn't touched. All passed:
  - `test_tool_form.py`: `test_tool_form_fill_by_parameter_path`, `test_tool_form_parameters_match_form`, `test_tool_form_parameters_for_rerun`, `test_tool_form_fill_counts_rendered_repeat_instances`
  - `test_workflow_editor.py::test_tool_form_fill_on_editor_step`

</details>
