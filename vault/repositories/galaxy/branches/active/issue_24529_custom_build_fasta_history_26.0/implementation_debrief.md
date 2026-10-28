# Implementation debrief

**STATUS: READY**. The third scope eval says keep the current scope.

Head is `025d2d5450c` on `release_26.0` (merge-base `29d1801ad21`), pushed to `jmchilton`. Commits:
1. `a5de02c79cf` Add custom build populator helpers (refactor)
2. `f7603faeb1f` Route API dataset conversions through HistoryManager (refactor, no behavior change)
3. `897eabb92b3` Pass conversion context to dependency converters (cherry-pick of `a3cb32cd95d`)
4. `bb3f23dc1c9` Stop double-encoding ids in converted/{ext} response
5. `814c879279f` Run API conversions in an active history the user owns (Fixes #24529)
6. `025d2d5450c` Return 202 from converted/{ext} while conversion deps are pending

## What it does

`HistoryManager.get_converted_dataset` only looks up a history when a converter actually has to run. Lookup order:
1. The dataset's own history.
2. The current history.
3. The most recent history.

Each must be owned by the requester (`user_id` compare, so no admin bypass) and be neither deleted nor archived. Anonymous users only get their current history. If no history qualifies, the request gets a 400.

Three endpoints use it: custom builds, `converted/{ext}` and feature search. `converted/{ext}` returns 202 while a dependency converter is pending.

## Round 3 (after John's expand decision)

- Implemented the 202 for pending dependencies.
- The review dropped the errored→4xx mapping John asked for. It can't be reached, because the model re-queues errored dependencies.
- The test challenge needed no changes.
- Codex P1 fixed: the current history must be owned by the requester. An admin's current history can belong to someone else.
- Thermo-nuclear cleanup: the lookup order is now explicit steps, and the converter check uses `can_convert_to`.
- Baseline refactor folded the fixes into the fix commit. The tree is identical to the pre-refactor `c60840e7689`.
- Third scope eval: keep the current scope.

## Validation at head (API tests run one at a time)

- unit `test_actions` + `test_HistoryManager`: 41 passed
- `test_datasets -k "converted or search_features or raw_data_no_converter"`: 6 passed
- `test_users -k custom_build`: 4 passed
- `make format` and mypy clean

Every new API test fails on merge-base.

## Not fixed

- If a dependency keeps failing, every poll re-queues it and gets 202. Fixing that needs a model change, best done on dev.
- Other callers: genomes, dbkeys, data-provider registry, model `convert_dataset`.

## Merge-forward to 26.2

- Take 26.2's model hunk (`261d166f2ab`).
- Drop the re-added `test_dependency_conversion_receives_target_context`.
- The first call there returns 200, so the 202 test has to expect 200 (or the 202 branch gets dropped).

## Other notes

- Likely to conflict with `custom_build_no_converter_400_26.0`.
- Local backups exist: `backup/issue_24529_pre_baseline_refactor` and `_2`.
- Not posted to the issue, per John.

```
created .../differential-review/snapshots/20261028T160347Z-hardening-025d2d5450cf.json
  hardening @ 025d2d5450cf vs origin/release_26.0 (merge-base 29d1801ad21b)
  since 20261028T150017Z-implementation-1ba51ea6acc9:
    commits: 4 same, 1 rebased, 1 changed, 0 new, 0 dropped
    hunks:   19 carried, 1 changed, 0 new, 1 dropped
```
