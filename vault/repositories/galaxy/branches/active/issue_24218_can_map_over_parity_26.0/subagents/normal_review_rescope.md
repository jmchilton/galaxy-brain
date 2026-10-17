# Normal review (re-scope): issue_24218_can_map_over_parity_26.0

**Top line:** Nothing to act on. `d29206dcd71` is correct, the tightening is exact, and it's safe for release_26.0. It only turns true into false, and only for input types that no in-tree tool declares. Tests are red-to-green on both sides, and parity holds: 0 `canMapOver` disagreements, and effective-type disagreements fell from 121 to 89, with the 32 removed all being bogus pairs. Ready.

Not worth acting on:
- 89 remaining client `effectiveMapOver` / server `effective_collection_type` disagreements. All existed before this commit (e.g. server `list:list:paired_or_unpaired` over `list:paired_or_unpaired` gives `list:list`), and none comes from a pair this commit changed. This is scope option D, a separate 26.0 follow-up.
- Python's in-branch comment ("then check alignment") still reads fine with the boundary. No change needed.
- A terminal/integration test for the new rejections isn't worth it. No fixture or real tool declares `paired:...:paired_or_unpaired`, and the unit asserts sit at the right level.

## Details

### Equivalence of `endswith(":" + required)` vs old check

Old: `higher.endswith(req) and higher != req`. New: `higher.endswith(":" + req)`.
- New ⊆ old: a `:`-prefixed suffix match implies `endswith(req)`, and `len(higher) > len(req)`, so the two strings can't be equal.
- Old minus new is exactly the set of matches where `req` ends partway through a rank token. The only rank names where one is a string suffix of another are `paired` ⊂ `paired_or_unpaired` (`list`, `record`, and `sample_sheet`, which normalizes to `list`, have no such overlap). So the only removed cases are inputs whose required higher ranks end in `paired` (`paired:paired_or_unpaired`, `paired:list:paired_or_unpaired` via `unpaired:list`, `paired:record:paired_or_unpaired`, ...) against outputs whose higher ranks end in `...unpaired[:rest]`.
- Dropping the `!=` guard is fine. The equal case (e.g. `paired:paired` over `paired:paired_or_unpaired`) has no spare rank, it's a direct match through `can_match_type`, and the new form still returns false for it.

### Parity harness (scratchpad: `.../scratchpad/review_rescope/`)

Ran `parity/py.py` over the current server module and over the server module at `d45d2fdb3bc`, then ran `parity/cmp.mts` on the current client file:
- Server old → new: **40 flips, all true → false**, and every flip has an input starting with `paired:` (as predicted above). Old effective types for them were nonsense or truncated (`paired_or_unpaire`, `list:list` for `list:list:paired_or_unpaired` over `paired:paired_or_unpaired`).
- Client vs server `canMapOver`: **0 disagreements / 7744 pairs**. `canMatch`: 0.
- `effectiveMapOver` disagreements: 121 → 89. All 32 removed were among the flipped pairs. None was added.
- New asserts red on prior commit: `paired_or_unpaired` and `list:paired_or_unpaired` over `paired:paired_or_unpaired` were true on both sides before. The positive `list:paired:paired` case stays true, with server effective type `list`.

### Server callers / release safety

Callers: `HistoryQuery.can_map_over` (query.py:81, through `is_subcollection_of_type`), used by `tools/parameters/basic.py` (2535, 2613, 2747), `tools/actions/__init__.py:1179`, `workflow/modules.py:660`. Also `structure.get_structure` (structure.py:266) and `effective_collection_type` itself.
- Every in-tree `collection_type=` declaring a compound `paired_or_unpaired` uses `list:` or `sample_sheet:` higher ranks (`list:paired_or_unpaired`, `sample_sheet:paired_or_unpaired`). For those, required = `list`, and no rank token ends in `list` except `list` itself, so the change is a **no-op for every in-tree tool**.
- Only arbitrary user-declared types (e.g. a workflow `data_collection_input` typed `paired:paired_or_unpaired`) could hit it. Before, that "mapped over" with no real extra rank and fed `paired_or_unpaired` elements into an input expecting `paired:paired_or_unpaired`, or computed garbage effective types. Nothing correct could have depended on it. The editor (client) had the same bug, so a saved workflow like that would now show a disconnected/invalid edge, which is the desired outcome.
- In `structure.py:266`, a false result now takes the `UninitializedTree` branch, but that is reachable only after parameter-level map-over, which now rejects these pairs first.
- Registry types: list, paired, paired_or_unpaired, record, sample_sheet. Nothing else affects the token-suffix analysis.

### Whole-branch sanity (`origin/release_26.0...HEAD`)

- Commit order: baseline tests → `canMapOver` parity → `collection_type_source` resolution → boundary. Baseline-first is kept.
- The client `canMapOver` now mirrors the server rule order line for line. `getCollectionTypeFromInput` prefers map-over, then falls back to `input.canMatch(output)`. The "any" input case still works because `ANY_COLLECTION_TYPE_DESCRIPTION.canMatch` accepts anything, so the result is still the connected output type.
- Nothing weakened. No imports touched. Comments are not obvious restatements.

### Tests run

- `pytest test/unit/data/dataset_collections`: 84 passed.
- `vitest run src/components/Workflow` (node 22.20.0): 32 files, 200 tests passed.
