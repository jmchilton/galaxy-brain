Two behavior-preserving refactor commits were pulled out of the fix commits and placed on the base after the "Baseline tests" commit. The three fix commits now contain only behavior changes and their tests. The final tree is identical to the old tip `54895f8dd2e`.

## New history (`6df388987b4..yaml_boolean_defaults`)

```
9894e813cc1 Keep explicit null Boolean default for YAML tools in request execution
a8c11371e6c YAML tools default omitted optional and Boolean value to False
1375c2233cf Honor YAML boolean values when loading tools
52974cbc957 Add YAML tool source predicate and child source factory methods   (new, refactor)
b7a8838e3ff Add InputSource hooks for Boolean default and text optionality     (new, refactor)
798fcac51ca Baseline tests for user tool authoring contracts                  (unchanged)
eaea0064b80 Function-scope API test interactor fixtures                       (unchanged)
```

Old tip: `54895f8dd2e`. `git diff 54895f8dd2e HEAD` is empty.

## Refactor commits

- **`b7a8838e3ff` InputSource hooks.** Adds `InputSource.parse_boolean_default(default, *, allow_none)` and `InputSource.parse_text_optional()`. The base implementations wrap the existing behavior: `checked` via `get_bool_or_none`/`get_bool`, and `text_input_is_optional`. The parameter model factory (Boolean and text), `boolean_is_checked`, and `TextToolParameter` call the hooks. The now-unused `text_input_is_optional` imports are dropped from `factory.py` and `basic.py`.
- **`52974cbc957` YAML tool source predicate and child source factory methods.**
  - `ToolSource.is_yaml_origin()` defaults to False; `YamlToolSource` returns True for class `GalaxyTool`/`GalaxyUserTool`.
  - `Tool.yaml_origin` wraps the predicate. `output_labels_read_tool_state` and `UserToolEvaluator` use it in place of two inline `parse_class()` tuple checks.
  - `YamlPageSource._input_source` and `YamlInputSource._page_source`/`_input_source` replace four direct constructor calls.
  - Equivalence: only `YamlToolSource` overrides `parse_class` under `lib/` (XML and CWL sources inherit `None`), so the predicate matches the old inline checks exactly.

## What stayed in the fix commits

- **`1375c2233cf`**: the `YamlInputSource.parse_boolean_default` override (`value` over `checked`).
- **`a8c11371e6c`**: the `CanonicalYamlPageSource`/`CanonicalYamlInputSource` classes and the `parse_input_pages` switch.
- **`9894e813cc1`**: the `yaml_origin` threading through `fill_static_defaults`/`_fill_defaults`/`_fill_default_for`, plus the `Tool` call sites.
  - Threading the parameter ahead of the fix would have meant adding an unused parameter, so it was not extracted.

Each fix commit was cherry-picked onto the refactors. The one conflict (in `yaml.py`, F1) was resolved so that every rebuilt commit differs from its original only by the refactor hunks that originally landed in later commits.

## Verification

- **Contract API module at `798fcac51ca`** (Baseline tests on base production code): 1 passed, 4 xfailed.
- **Contract API module at `52974cbc957`** (after the refactors): 1 passed, 4 xfailed. This is identical to the baseline.
- **Contract API module at the tip:** 46 passed, 4 xfailed.
- **Parameter/source dump** over all 442 parseable tools in `test/functional/tools`: byte-identical between base production code and `52974cbc957`.
  - The dump covers the factory parameter models, `parse_optional`, `boolean_is_checked`, `text_input_is_optional`, and conditional tests, walking into nested inputs.
  - It differs at the tip (26 lines, YAML tools only), which shows it is sensitive to these changes.
- **Unit tests at `52974cbc957`** (`test/unit/tool_util test/unit/app/tools test/unit/workflows`): 2033 passed, 6 skipped, 2 xpassed.
  - 38 failed, all known environment failures: CWL schema_salad (27), conda resolution (4), mulled (6), and the watcher (1).
- **Lint at `52974cbc957`:** ruff 0.15.13, black, and isort clean. Commit hooks passed on every new commit.
  - mypy from `lib/`: no errors in the changed files (24 unrelated pre-existing errors).
