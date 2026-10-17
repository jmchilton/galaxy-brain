# Implementation debrief

STATUS: READY. Head `c217ced0660`, base `release_26.0` (`a6544be047d`), pushed to `jmchilton`. Previous debrief (head `d29206dcd71`) in `earlier_drafts/2/`.

## Commits
- `3e3b6d75e8b` Baseline tests: new `collectionTypeDescription.test.ts` pins `canMapOver` cases already agreeing with server.
- `0e9a619bda4` `canMapOver` in server `has_subcollections_of_type` rule order. Fixes the issue's 6 rows; 2 terminals tests cover the 💥 editor rows.
- `d45d2fdb3bc` `getCollectionTypeFromInput` resolves `collection_type_source` like server `create_collection`: map-over → declared input type, direct match → connected type.
- `d29206dcd71` (re-scope) `:` rank boundary on compound `X:paired_or_unpaired` higher-rank check, client + server.
- `c217ced0660` (change request) `collection_semantics.yml` examples `COLLECTION_INPUT_LIST_PAIRED_OR_UNPAIRED_NOT_CONSUMES_PAIRED` / `..._NOT_CONSUMES_PAIRED_OR_UNPAIRED`, linked to the 2 new terminals rejects; `collection_semantics.md` regenerated (`semantics.generate_docs()`). Full examples (not test-only) because examples without `then:` don't render. Server unit test gains the `paired_or_unpaired` → `list:paired_or_unpaired` assert and names both labels.

## Change notes
- Local pre-commit (`.pre-commit-config.yaml.sample`) prettier / trailing-whitespace / end-of-file-fixer skipped for `c217ced0660`: prettier rewrites the whole generated md and strips LaTeX `\_` escapes; the others touch unrelated pre-existing lines. Committed md is byte-identical to generator output, as upstream's is. Repo has no `.pre-commit-config.yaml`, so CI doesn't run them.
- `collection_semantics.md` was not stale before this change (regenerating at base gave no diff), contrary to `test_challenges_debrief.md`.
- 1 test modified (< 3), no UI change: no fresh test challenge or screenshots.

## Validation
- Client terminals: 82 pass. Python `test/unit/data/dataset_collections`: 84 pass. Earlier: client `src/components/Workflow` 32 files / 200 tests.
- Parity harness: 0 `canMapOver` / 0 `canMatch` disagreements over 7744 type pairs.
- Normal review of the change: no blockers; 1 nit taken, 1 skipped (`subagents/normal_review_semantics_doc.md`).
- Hardening (after re-scope): test challenges, Codex (0), thermo-nuclear (approve), baseline refactor (none), scope evaluation (keep).

## Scope
- Re-scoped once; original scope as `issue_24218_can_map_over_parity_26.0_alt_original_scope` (client-only).
- Merge-forward: `collectionTypeDescription.test.ts` add/add conflicts with the 26.1+ file; keep both `describe` blocks.

## Follow-ups (not done, see scope_evaluation.md)
1. Separate 26.0 branch: effective map-over type bugs (`sample_sheet` truncation both sides; server compound `list:list:paired_or_unpaired` over `list:paired_or_unpaired` → `list:list`). Issue queued: `vault/agents/gx_issues/to_file/effective_map_over_type_sample_sheet_and_compound.md`. PR description should name this as a known follow-up (parity claim covers `canMapOver`/`canMatch` only). `collection_semantics.yml` has no `sample_sheet` examples; that fix could add them.
2. Dev: shared client/server parity table with pinned expectations.
3. Dev: one rank-sorted declared-type resolver for `_effectiveMapOver` + `getCollectionTypeFromInput`; server `create_collection` direct-match-first.
4. Dev: drop `_endsWith` for native `endsWith`.
