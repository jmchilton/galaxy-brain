# Polish debrief

2026-10-25. Head `30f986a5a48`, base `release_26.0`.

## Rebase

Parent `issue_24218_can_map_over_parity_26.0` merged as #24227 (merge commit `f7684130e39`). Rebased the 6 branch commits onto `origin/release_26.0` with no conflicts (range-diff: only context shifts in `FormData.vue` imports). Force-pushed `6abce38796f` → `30f986a5a48` with lease. Old SHAs in other debriefs predate this rebase.

## Checks

- CI: previous head greenish (2026-10-20 TICK). Fork CI on `30f986a5a48` queued at hand-off.
- Vitest `src/components/Form src/components/Workflow`: 55 files, 355/355 (scope evaluation asked for this after the 24218 move).
- `vue-tsc --noEmit` clean; prettier clean; eslint 0 errors, 2 pre-existing `any` warnings in `FormData.test.ts`.
- `test_tools.py`: black/isort clean; mypy reports no errors in it (52 errors elsewhere, from imports; not this branch). `ruff` not in `.venv`, skipped.
- `make format` not run: it reformats the whole repo; changed files checked directly instead.

## Checklist (GENERAL.md)

Fresh subagent: every item passes; human-read item left unchecked. Not workflow-related (only imports the editor's existing `CollectionTypeDescription`). Concerns raised, none blocking: the `sample_sheet` map-over decision (still open), alert wording mixes raw input types with `collectionTypeToText` (pre-existing).

## Strengthening

One round. No branch tasks. Description edits applied: highlighted 26.0-only and editor-untouched clauses, moved the `sample_sheet` relaxation up as a highlight, "(merged)" on #24227, fixed `paired_or_unpaired` vs `list:paired_or_unpaired` row wording, recast the empty-`collectionTypes` change as gate consistency (server sends `null`, `basic.py:2570-2573`). Unverified claim kept from debriefs: each fix commit fails at its parent.

## Left for John

- `sample_sheet` map-over drop: keep (matches dropdown) or tighten server `match_multirun_collections`?
- Follow-ups (scope widening): E2E drop helper that fires `dragenter`; server `to_dict` emitting `map_over_type` for a selected DCE.
