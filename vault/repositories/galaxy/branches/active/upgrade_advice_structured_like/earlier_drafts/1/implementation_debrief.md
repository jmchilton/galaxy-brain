# upgrade_advice_structured_like — implementation debrief

Fixes galaxyproject/galaxy#23884. One commit `020e99badab` on `dev` @ `4f78c5014e8`, pushed to `jmchilton`.

## What changed
- `ProfileMigration26_0` (24.2 → 26.0) emits `26_0_fix_unqualified_structured_like` (`must_fix`) once per collection output whose `structured_like` names a conditional/section-nested input without `|`. Per-output message gives the qualified name(s).
- Dropped `18_01_consider_structured_like` (nothing changed at 18.01; gate was 18.09 then 26.0).
- `latest_supported_version` 24.2 → 26.0. Grep found no other 25.x/26.0 profile gates; 26.1/26.2 gates exist, so stopping at 26.0 is honest.
- Shared resolution: `iter_output_input_references()` in `linters/_util.py` (moved `_collect_param_qualified_paths`/`_get_qualified_name` there); `OutputsStructuredLikeReference` and `OutputsFormatSourceReference` and the advisor all use it.
- XSD `structured_like` doc notes the 26.0 mapped-over behaviour.

## Naming deviation from issue
Issue proposed `26_0_structured_like_must_be_qualified`. Used `26_0_fix_unqualified_structured_like` to match the `<ver>_<level>_<topic>` convention (`16_04_fix_*`, `24_2_fix_*`).

## Tests
- `test_1801_consider_structured_like` **replaced** by `test_26_0_unqualified_structured_like` (the 18.01 claim was the bug). Added section-nested positive and already-qualified negative cases via a `tmp_path` template.
- `test/unit/tool_util/upgrade/` + `test_tool_linters.py`: 134 passed. Pre-commit (black/ruff/flake8/isort) green.

## Review suggestions not acted on
- **`type_source` advice** — reviewer showed `type_source` hits the same 26.0 mapped-over gate (`model/dataset_collections/structure.py` → `sliced_input_collection_structure`). Implemented, then backed out: per `gx_issues/to_file/proposed_type_source_nested_inputs_and_digit_names.md`, the qualified `cond|input` `type_source` *crashes* non-mapped-over runs, so advising qualification would push authors into a crash. That issue is now #23886 (branch `type_source_nested_inputs`), which rejects bare `type_source` at every profile, so no 26.0 `type_source` advice is needed; a `type_source` linter erroring on bare nested refs is the follow-up instead.
- **Escalate `OutputsStructuredLikeReference` to error at profile ≥ 26.0** (like citations/tests linters) — reasonable, but changes lint behaviour beyond the issue. Follow-up.
- **Repeats** — `_get_qualified_name` omits repeat names, so a ref into cond>repeat gets a bogus `cond|x` suggestion; execute.py never resolved repeats anyway. Nonsense tool shape; left.
- **Top-level name shadowing** — top-level + nested param of same name: pre-26.0 resolution can pick the nested one depending on dict order; advisor stays silent. Very edge; left.
- **Typed parameter-model walk** (`parameters/visitor.py`) instead of XML walk — better long-term, bigger change.

## Pre-existing bugs noticed (not fixed — would change other migrations' output)
- `upgrade/__init__.py` `_find_all` ignores its `xpath` arg (always `.//data[@from_work_dir]`), so `23_0_consider_optional_text` never fires.
- `ProfileMigration21_09` calls `advice_collection.add("")` → would `KeyError` on a `from_work_dir` with whitespace.
- `advise_on_upgrade` compares versions as strings.

## PR notes
- Removes public advice code `18_01_consider_structured_like`; no consumers found in local planemo/language-server clones.
- Unblocks part of #23877 (`tool_parameter_references`) doc refresh.

## CI follow-up (`cbbfcc7c445`)
Fork CI on `020e99badab` was red across Unit, API, Integration, packages, Selenium, Playwright and workflow framework. One cause: the new module-level alias `ParamQualifiedPaths = dict[str, list[str]]` in `linters/_util.py`. Linter discovery (`lint_tool_source_with_modules`) scans every linter submodule, and on Python 3.10 `inspect.isclass(dict[...])` is true but `issubclass` raises `TypeError` — so every lint call (and every user-defined tool create) crashed. Fixed in `lint.py` by skipping `types.GenericAlias`, so future aliases in linter modules are safe too. Red→green on a py3.10 venv (`test_container_shape_lint.py`, `test_user_tool_authoring_help.py`, agents, linters, upgrade tests). Other reds: Rucio docker image (infra), `test_data_input_recovery_on_delayed_input` (unrelated, flaky).
