# upgrade_advice_structured_like — implementation debrief

**STATUS: READY.** Head `a9580538c98` on `dev` @ `a9a68082414`, pushed to `jmchilton`. Fixes #23884; re-scoped (John, 2026-10-27) to cover all 26.x profile gates. Original scope: `upgrade_advice_structured_like_alt_original_scope` ([alt](alts/original_scope.md)). Fresh fork CI not yet seen.

## Final implementation (13 commits)
- **Refactors first:** `InputReferences` moved from `linters/output.py` to `linters/_util.py` (+ `legacy()`, `is_dataset_input`); `writes_galaxy_json` shared by output linter + advisor; `tool_requests_provided_metadata` extracted from `AbstractTool` into `parser/output_objects.py`.
- **26.0:** drop `18_01_consider_structured_like`; `26_0_fix_unqualified_structured_like` (must_fix) for bare or partially qualified refs to nested dataset inputs; skips repeats and non-data params.
- **Advisor bug fixes:** 21.09 `add("")` KeyError → `21_09_fix_from_work_dir_whitespace`; skip migrations whose target ≤ tool profile (**behaviour change**); `_find_all` honours xpath; 24.2 test-case validation at profile 24.2 (was latest=26.1).
- **26.1/26.2:** `26_1_fix_invalid_citation`, `26_1_fix_empty_multiple_test_value`, `26_2_consider_optional_boolean_unset`, `26_2_consider_tool_provided_metadata`, `26_2_consider_tabular_assertion_separator`; `latest_supported_version` 26.2; `profile` kwarg on `validate_test_cases_for_tool_source`.

## Choices
- Code name `26_0_fix_unqualified_structured_like` kept over issue's `26_0_structured_like_must_be_qualified` (John confirmed).
- Resolver stays in `linters/_util.py`; #23891/#23902 move it to `parser/output_references.py` and will conflict on whichever lands second.
- Old `lint.py` GenericAlias guard and XSD edit dropped (no alias added; dev XSD already correct).

## Hardening
Brain research → test challenges → Codex (3 confirmed, fixed) → thermo-nuclear (1 dedup fixed) → baseline refactor → scope eval: **keep** → check branch (format clean; mypy no new errors after annotating `writes_galaxy_json`). First pass + scope eval in `earlier_drafts/2/`. Tests: upgrade + linters + parameter cases 206 passed; `app/tools -k provided_metadata` 25 passed.

## Open / follow-ups
- Top-level `structured_like` name shadowed by earlier nested input: resolution flips at 26.0, advisor silent.
- `use_latest_profile` hardcodes "26.1".
- Possible PR split: (refactors + 26.0) for #23884, (bug fixes + 26.1/26.2) second.

## Snapshot
```
created .../differential-review/snapshots/20261027T183555Z-hardening-a9580538c98e.json
```
