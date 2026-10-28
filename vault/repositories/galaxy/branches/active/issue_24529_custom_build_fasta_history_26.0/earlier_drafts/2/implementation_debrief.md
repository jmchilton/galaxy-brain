# Implementation debrief

**STATUS: BLOCKED** — parked on a scope decision (second scope eval recommends a small expansion; process forbids a second re-scope).

Head `0a6c27e2cae` on `release_26.0` (merge-base `29d1801ad21`), pushed to `jmchilton`. Commits:
1. `a5de02c79cf` Add custom build populator helpers (refactor)
2. `f7603faeb1f` Route API dataset conversions through HistoryManager (refactor, no behavior change)
3. `897eabb92b3` Pass conversion context to dependency converters (cherry-pick `a3cb32cd95d`, on 26.2/dev)
4. `bb3f23dc1c9` Stop double-encoding ids in converted/{ext} response
5. `0a6c27e2cae` Run API conversions in an active history the user owns (Fixes #24529)

Choices: `HistoryManager.get_converted_dataset` resolves a history only when a converter must run — dataset's history if user owns it (`user_id` compare, no admin bypass) and active, else active current history, else most recent active, else 400. Used by `add_custom_builds`, `converted/{ext}`, feature search. Original #24529-only scope kept as alt `_alt_original_scope` @ `cef99a41ee1`.

Process: brain research; normal review (strengthened test, archived check); scope eval → expand; rescope + review (fixed 400-for-already-converted regression); test challenge (unit test → API tests, search_features test); codex (1 P2 race, not acted); thermo (small cleanup); baseline refactor (refactors first; tree identical). `make format`/mypy clean. Tests: test_datasets -k "converted or search_features or raw_data_no_converter" 5 passed; test_users -k custom_build 4 passed; unit 41 passed.

## Decision needed

Second scope eval (`scope_evaluation.md`): `converted/{ext}` still 500s for targets with `depends_on` (e.g. tabix←bgzip) — `None` while dep pending gets serialized; errored dep raises uncaught `ConverterDependencyException`. Proposed ~6 lines: `AcceptedRetryLater` (202) on None, map `ConverterDependencyException` to 4xx, API test `converted/tabix` on BED → 202. Also: first eval wrongly said the backport fixes tabix. Options: accept expansion (remaining validation: red→green + normal review), ship as is, or split (decompositions in scope eval). All reviews/tests above still apply if declined.

Not fixed: genomes/dbkeys/data-provider registry/model `convert_dataset` callers. Merge-forward: take 26.2's model hunk (`261d166f2ab`) and drop re-added `test_dependency_conversion_receives_target_context`. Conflicts likely with sibling `custom_build_no_converter_400_26.0`. Local-only restore branch `backup/issue_24529_pre_baseline_refactor` @ `2b86cad3ba8`. Not posted to issue (BLOCKED; a private security note touches the same endpoint).

```
created .../differential-review/snapshots/20261028T061915Z-hardening-0a6c27e2cae3.json
  hardening @ 0a6c27e2cae3 vs origin/release_26.0 (merge-base 29d1801ad21b)
  since 20261028T053851Z-implementation-dacb7d38dd6b:
    commits: 0 same, 1 rebased, 1 changed, 3 new, 4 dropped
    hunks:   16 carried, 2 changed, 3 new, 3 dropped
```
