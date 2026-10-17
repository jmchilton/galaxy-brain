# Debrief: client_can_map_over_paired_or_unpaired_parity

## Research (reviewer, independent rerun)

- Pulled `collectionTypeDescription.ts` from origin/dev (7c86d742327), release_25.1, release_26.0 and ran under node `--experimental-strip-types` on 16 type pairs: `canMapOver`, `accepts`, `effectiveMapOver`. All 9 table rows reproduce on all three branches.
- Pulled `type_description.py` from the same branches, ran with stubbed imports (`uv run python -I`). dev rows match the table. 25.1 has no compound `:paired_or_unpaired` support (`list:list`, `list:list:paired`, `list:list:list` over `list:paired_or_unpaired` all false). 26.0 matches dev.
- 💥 rows: confirmed `effectiveMapOver` returns `CTD("")` (`substring(0, negative)` fallthrough) and `accepts` is false. Traced `InputCollectionTerminal.attachable` / `_effectiveMapOver` on dev: only `NULL_COLLECTION_TYPE_DESCRIPTION` is filtered, empty `mappingConstraints` passes `every`. Code trace only, no editor/vitest run.
- Ran fixed client from `00e2bf07047` on all 16 pairs: identical to dev server. Its test adds 5 asserts covering paired/list/list-over-`list:list:p_o_u`; not the `paired_or_unpaired` / `list:paired_or_unpaired` output cases (issue already says so).
- Server callers of `can_map_over` on dev confirmed: `query.py`, `basic.py`, `tools/actions`, `workflow/map_over.py`, `structure.py`. In `map_over.py`, a false `can_map_over` means the input isn't mapped; data passed straight through.
- Cited refs: #19377 (commit 219796f049c, added client p_o_u logic incl. rank branch), #22170 (7d918fe9e00, Python compound fix), #22565 (120f527c5ae, rename to `can_map_over`), #21271 (open, p_o_u usability), #20657 (open, feature). All correctly described. Fix commit is pushed to `jmchilton/galaxy`, link resolves.
- Dupe search (`canMapOver`, `list:paired_or_unpaired`): none.

## Corrections vs. raw draft (writer already made these; reviewer confirmed)

- Raw draft: client lets `paired_or_unpaired` map over itself. Wrong: client returns false (`"paired_or_unpaired".endsWith("paired")`). Real self case is `list:paired_or_unpaired`. Commit message of `00e2bf07047` repeats the wrong claim; worth amending before PR.
- Raw draft: tool-form matching uses `canMapOver`. Only on feature branch; dev callers are `terminals.ts` only.
- Raw draft: 25.1 backport is "same logic". Server on 25.1 lacks compound support, so no full parity there.

## Review changes

- Softened "easy to build workflows that can't run" (no end-to-end run) to what code shows: server doesn't map over, collection passed to a mismatched input.
- Repro note: 26.0 client also verified.
- Backport bullet: 26.0 backport gets full parity (server has compound code).

## Leftovers / doubts

- Editor acceptance traced, not exercised (no `terminals.test.ts` case for 💥 rows). A terminals test for `paired` -> `list:paired_or_unpaired` would make it airtight and belongs in the PR.
- Actual runtime failure mode for 💥 workflows (error vs. silent wrong run) not observed.
- Python `single_datasets` branch has no client counterpart; out of scope.

## Recommendation

Post. Real, reproduced client/server divergence with a verified fix. Could also go PR-first (fix is small and done) — keep internal if John prefers to just open the PR referencing #20657.
