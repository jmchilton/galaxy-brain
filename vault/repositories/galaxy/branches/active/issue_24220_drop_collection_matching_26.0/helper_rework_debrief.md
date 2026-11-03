# Split-type helper rework debrief

2026-11-02. John: move to the shared helper if it means less duplication and stronger abstractions. Head `340e7139d0b` → `3ec0b6573f5` (force-pushed with lease). Old head kept as local branch `issue_24220_drop_collection_matching_26.0_pre_helper`.

## Commits (on `93ee487fbe5`, Marius' guard)

1. `9d92e305707` Baseline tests. API run tests now post the `map_over_type` `/build` lists and pin it (`list`, `list:paired`); red on base, where `/build` lists `list:paired_or_unpaired` and the run 400s. Separate listing test folded into them.
2. `eadfb718432` Extract `CollectionTypeDescription.split_collection_type` (+ TS `splitCollectionType`, `HistoryQuery.map_over_type`); `basic.py`, `workflow/modules.py`, `collectionMatch.ts` call it. Behavior-free; bare-rewrite unit rows green.
3. `daf4827e52a` Helper learns compound `X:paired_or_unpaired` (kept if collection already ends in `:<type>`; else `X:paired` / `X`). Compound unit + FormData rows red before, green after.
4. `3ec0b6573f5` `sample_sheet` skip (server `query.py` + client), from old `63acc87c159` / `30d5f79f4c7`.

## Duplication

- Before: bare rewrite 3× (`basic.py`, `modules.py`, `collectionMatch.ts`), compound check 2× (`subcollections.py`, `collectionMatch.ts`), `sample_sheet` skip 2×.
- After: one rule on `CollectionTypeDescription` + TS mirror; `sample_sheet` skip still 2× (`HistoryQuery` and its client mirror).
- `subcollections.py` back to base (no calls to `has_subcollections_of_type` / `can_match_type`, renamed on 26.1/dev).
- Marius' literal-suffix guard kept (promised publicly 2026-10-29); its compound exemption dropped, since every split type is now a literal suffix.

## Tests dropped

`test_subcollections.py` (this branch's own, unmerged): compound split tests pinned code now reverted. Replaced by `split_collection_type` table tests (Python + TS), `HistoryQuery.map_over_type` tests and the API run tests.

## Checks

- Unit `test/unit/data/dataset_collections/`: 102 passed. Vitest FormData + `collectionTypeDescription`: 95 passed. `vue-tsc` clean; eslint 0 errors; prettier clean; mypy: no errors in changed files.
- API `test_tool_execute.py -k "paired_or_unpaired or sample_sheet"`: 11 passed. Framework workflows `nested_over_list_paired_or_unpaired`, `flat_over_paired_or_unpaired`: 2 + 2 passed.
- Not run: API tests at the baseline commit (red by construction, as before).
- No test covers a subworkflow mapped over `paired_or_unpaired`; `modules.py`'s `subworkflow_structure` branch asserted on compound ranks before, literal ranks now.

## Environment

`uv run python` in the worktree re-synced `.venv` (gxformat2 0.29.1); restored with pinned + dev requirements and `psycopg_binary`.
