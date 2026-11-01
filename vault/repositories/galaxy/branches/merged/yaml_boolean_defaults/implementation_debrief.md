# yaml_boolean_defaults — implementation debrief

**STATUS: READY.** Recovered/hardened 2026-10-20: rebased to `release_26.1`, hardened, re-scoped once (repeat/section), re-hardened. Tip `58f9664c617` on `jmchilton/yaml_boolean_defaults`; base `origin/release_26.1` (merge-base `6df388987b4`). No CI seen on this tip yet. No PR opened.

## Final implementation

YAML tools (disk `GalaxyTool`, API `GalaxyUserTool` from YAML/JSON) follow the canonical tool_util_models parameter contract on every load path (#23888 slice 2); XML unchanged (parameter-model dump byte-identical for all XML tools at every step).

History (each fix carries its red tests):
1. `eaea0064b80` Function-scope API test interactor fixtures (CI 401 fix).
2. `923173b9e3e` Send `use_cached_job` only when requested in `DescribeToolExecution` (form `"False"` was truthy → cache on in tests).
3. `2b351605ed4` Baseline tests for user tool authoring contracts (helpers, `DescribeUserTool`, tool_uuid execution, `user_tool` fixture; passes on base).
4. `8541fd2a3b3`, `087336e8249` behavior-neutral refactors: `InputSource.parse_boolean_default`/`parse_text_optional` hooks; `ToolSource.is_yaml_origin`, `Tool.yaml_origin`, YAML child-source factory methods.
5. `f3178c7f971` honor explicit YAML Boolean `value`; `1e2386509f6` omitted `optional`/optional Boolean → False (`CanonicalYaml*` sources); `cdebfcb580d` explicit null Boolean kept under request execution.
6. `6029ff27032` canonical `repeat` (`parameters:`, `blocks:` fallback) and `section` loading; null repeat `min`/`max` from API tools = unset; legacy user-tool `$(inputs)` drops `__index__` (via `boltons.remap`). `f88b9c28691` YAML Boolean policy in `strictify` sections. `58f9664c617` drop conditional `__current_case__` too.

Size: ~1072 lines, none generated (prod 182, test infra 183, contract module 201, fixtures 496, docs 10).

## Decisions

- Rebased from a stale `release_26.1` base (309 behind); only conflict `tool_request_raw` kwargs. Earlier "5-path conflict" notes were vs `dev`.
- First scope evaluation → John chose expansion (repeat/section). Original scope: `yaml_boolean_defaults_alt_original_scope` ([alt](alts/original_scope.md)).
- Second scope evaluation: keep as implemented ([scope_evaluation.md](scope_evaluation.md)); lists 4 decomposition options — infra commits (1–3) land first in all.
- Group-state cleanup uses existing `boltons.remap` rather than sharing `meta.py`'s in-place `_remove_internal_state_keys` (base code, different mutation semantics).

## Validation

Contract module 64 passed (no xfails); base production with current tests 47 failed/11 passed/6 skipped, each commit's reds owned by later commits. At tip `58f9664c617`: contract module 64, `test_unprivileged_tools.py` 17 passed. At re-scope review (`d31abb1b55b`, pre-`remap`): `test_tool_execute.py` 117, framework `simple_constructs_y`/`gx_repeat*`/`gx_section*` pass. Unit tool_util/app/tools/workflows 2039 passed (38 known env failures: cwl/conda/mulled/watcher). ruff 0.15.13/black/isort/mypy (changed files) clean.

## Debriefs

[initial](initial_implementation_debrief.md) · [re-scope](implementation_rescope_debrief.md) · [test challenges](test_challenges_debrief.md) · [codex](codex_review.md) · [thermo-nuclear](thermo_nuclear_review.md) · [baseline refactor](baseline_refactor.md) · [scope](scope_evaluation.md) · first pass in `earlier_drafts/1/`.

## Follow-ups / PR notes

- PR must flag YAML behavior change on a release branch and mention the conftest fixture-scope change. Also user-tool changes from the re-scope: legacy/21.01 `$(inputs)` no longer contains `__index__`/`__current_case__`; null repeat `min`/`max` (API user tools) now loads instead of failing.
- Not done: 21.01 ignores repeat `min` when omitted (shared with XML); legacy `to_cwl` path leaks top-level runtime keys into `$(inputs)`; `simple_constructs.yml` still uses `blocks:`; `meta.py` cleanup could move to `remap`.
