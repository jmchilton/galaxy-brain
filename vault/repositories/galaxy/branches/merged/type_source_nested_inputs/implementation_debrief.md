# type_source_nested_inputs — implementation debrief

Fixes galaxyproject/galaxy#23886. One commit `250af0005ed` on `release_26.1` @ `a9a10abb470`, pushed to `jmchilton`. **Targets `release_26.1`** (user's call; first built on `dev`, then rebased with trivial conflicts in the `typing` import list and `_collect_inputs` signature; `trans` left unannotated as on 26.1). Framework (5), mapped workflow, API (9), unit tests and mypy baseline re-run green on 26.1.

## What changed
- `collect_input_dataset_collections` records each collection-holding param (`DataCollectionToolParameter`, or `DataToolParameter` given a collection) by **qualified key only** (one `record()` helper writes both dicts).
- `OutputCollections.create_collection` looks the param up instead of string-walking `tool.inputs`. Bare legacy alias → error naming output + the qualified key (`LegacyUnprefixedDict.qualified_key()`); other miss → error naming output + `type_source`.
- **Deviation from the filed issue:** #23886 proposed recording legacy aliases too, which made the bare alias newly *work*. It never worked (crashed mapped and unmapped), so John asked to reject it instead. Issue comment explaining the change: https://github.com/galaxyproject/galaxy/issues/23886#issuecomment-5969319163
- `_collect_inputs` returns `CollectedToolInputs` NamedTuple (was a 6-tuple, would have been 7).
- `LegacyUnprefixedDict.map_values()` builds `input_collections` keeping aliases (still needed for `format_source`/`structured_like`, which did resolve legacy aliases); replaces the `_legacy_mapping` poke in execute. In `model_operations.py` aliases only feed `type_source`, which is now strict, so no behaviour change there.

## Tests (red → green)
- Framework tools: `collection_type_source_conditional` (qualified), `collection_type_source_digit_name` (`reads_1`), `collection_type_source_section_repeat` (passed before too — regression guard).
- Workflow framework: `collection_type_source_conditional_mapped` (list:list over conditional input). Red on dev with `'Conditional' object has no attribute 'inputs'`; assertion confirmed enforced by temporarily breaking it.
- API `test_collection_type_source_unqualified_rejected` (tool `collection_type_source_conditional_unqualified`, no `<tests>`): red while aliases resolved, green with strict lookup — 400 + message naming `cond|input_collect`.
- Also green: existing `test_map_over_collection_type_source`, API `-k "merge_collection or filter_failed or zip"` (8), `test/unit/app/tools/` (726). No new mypy errors.
- Worktree `.venv` is a symlink to `job_files_hardening/.venv`.

## Review suggestions not acted on
- **"Does not name a collection input" error untested** (bare-alias error is tested) — reachable via misspelled/unselected-branch `type_source`; still a bare `Exception` (existing style). Better caught statically: no `type_source` linter exists → follow-up; it should *error* on bare nested refs at any profile (stricter than the `structured_like` warning, since bare `type_source` never worked).
- **Single dict of `(param, value)` per key** instead of two parallel dicts — cleaner, but touches every consumer of the `(value, reduced)` pairs; scope creep for a bug fix.
- **`rep_1` / nested-conditional fixtures** — same prefix logic as covered cases; skipped.

## Follow-ups
- `type_source` upgrade advice on `upgrade_advice_structured_like` (#23884) is now moot — bare `type_source` is rejected at every profile, not gated at 26.0. A `type_source` linter (see above) is the right home instead.
