# Test challenges debrief (round 4, profile 27.0 gate)

Top line: one cleanup. New linter fixture `OUTPUTS_FORMAT_SOURCE_SHADOWED_LEGACY_27_0` was built by chained `.replace()` on another fixture, with a test asserting the replace landed (fixture self-check, silly). Spelled it out as a literal, dropped the self-check. HEAD `f7b5ad8f098` -> `b28aa18d1b5`, force-pushed to `jmchilton`.

## Commit `f7b5ad8f098` tests

- `test_unresolvable_reference_fails_load_from_profile_27_0` (app/tools): loads at 26.2 (ref dropped to None) and fails at 27.0. Red with HEAD~1 lib (raises at 26.2). Kept.
- `test_shadowed_legacy_alias_fails_load_from_profile_27_0`: 26.2 keeps `input1`, 27.0 fails with ambiguity msg. Red with HEAD~1 lib. Kept; real tool load, no mocks.
- `test_outputs_format_source_shadowed_legacy_profile_27_0` / `test_outputs_metadata_source_shadowed_legacy_profile_27_0`: red with HEAD~1 lib at assertion. Kept; fixture rewritten (above).
- `test_outputs_format_source_shadowed_legacy_before_profile_27_0`: passes on HEAD~1 too - it is a regression pin that the error stays profile-gated (warn, not error, below 27.0). Kept as the negative half of the gate.
- Message updates (`26.2` -> `27.0`) in `test_outputs_format_source_discovered_legacy`, `test_outputs_metadata_source`: red with HEAD~1 lib. Kept.

## Rest of branch

Unchanged since round 3 (`earlier_drafts/3/test_challenges_debrief.md`); conclusions stand. No mocks/SimpleNamespace; linter is XML-only and load-time errors are tool-parse concerns, so unit layer is right. No E2E surface.

## Not acted on

- No API test for 27.0 load failure; unit tool-load test covers it via real `Tool` construction.

Verified: linter format/metadata_source + list_linters + `test_output_references.py`: 20 passed.
