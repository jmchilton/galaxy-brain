# yaml_boolean_defaults — re-scope debrief

First hardening pass (2026-10-20) ended with a scope evaluation recommending a modest expansion: finish #23888's model→loader slice by loading canonical YAML `repeat`/`section` inputs and applying the YAML Boolean policy inside `strictify` sections. John chose to expand. The pre-expansion branch is kept as `yaml_boolean_defaults_alt_original_scope` (`9894e813cc1`, [alt](alts/original_scope.md)); first-pass debriefs are in `earlier_drafts/1/`.

## What the expansion added (on top of `9894e813cc1`)

- `70ca0fc2f65` Load canonical repeat and section inputs in YAML tools — `CanonicalYamlInputSource` reads `type: section` and nested `parameters:`; repeats (only) fall back to legacy `blocks:` so `simple_constructs.yml` still loads. Two runtime fixes job-level testing surfaced: API-created user tools serialize unset repeat `min`/`max` as `null` (crashed `float(None)` → HTTP 500; now treated as unset), and legacy/21.01 user-tool jobs leaked repeat `__index__` into `$(inputs)`. The 4 strict structural xfails became `test_repeat_contract`/`test_section_contract` (3 load paths × 3 input formats, exact job JSON). `gx_user_repeat`/`gx_user_section` YAMLs moved to `test/functional/tools/parameters/` and registered so the disk path is covered.
- `4fd7e617ba3` Apply YAML Boolean policy to sections in strictify — `strictify(..., yaml_origin=False)`; `JobsService` passes `tool.yaml_origin`. Red: 3 request-format section cases gave `False` for an explicit null flag.
- `d38a1d6b1d6` (from review) Drop conditional `__current_case__` from legacy user tool inputs — one `_strip_group_state_keys` helper removes `__index__`/`__current_case__` only; conditional fixtures now render `inputs.choice` whole (6 cases red→green).
- `d31abb1b55b` (from review) Send `use_cached_job` only when requested in `DescribeToolExecution` — form-encoded `"False"` was read as truthy, so legacy/21.01 test runs had the job cache on. Contract module passes with it off.

Review also narrowed the `blocks:` fallback to repeats and strengthened the repeat contract (request-format `{}` fills `min`; optional null Boolean survives every format).

## Validation

- Contract module: 64 passed (no xfails). `test_tool_execute.py` 117 passed; `test_unprivileged_tools.py` 17 passed; framework `simple_constructs_y`, `gx_repeat*`, `gx_section*` passed.
- Unit `tool_util`/`app/tools`/`workflows`: 2039 passed; 38 known env failures (cwl/conda/mulled/watcher).
- Parameter-model dump over `test/functional/tools`: byte-identical for all XML and pre-existing YAML tools vs `9894e813cc1`.
- ruff 0.15.13, black, isort, hooks, mypy (changed files): clean.

## Review

A normal subagent review ran on the re-scope commits and its fixes are listed above. No review debrief document was written for it, per the review-debrief policy.

Not acted on:
- Repeat `min` ignored in 21.01 format when the repeat is omitted — `populate_state` is shared with XML; fixing changes XML. Gap noted in the test.
- Legacy/21.01 user-tool jobs still render via deprecated `to_cwl`, leaking top-level `__input_ext`, `__use_cached_job__`, `chromInfo`, `dbkey` into `$(inputs)` — pre-existing, affects all legacy-format user tools; follow-up, not release-branch material. Fixtures pick keys explicitly for this reason.
- `simple_constructs.yml` still uses `blocks:` — fixture-conversion slice of #23888.
