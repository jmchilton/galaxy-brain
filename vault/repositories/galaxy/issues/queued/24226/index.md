# galaxy#24226: server effective map-over type under-strips compound `:paired_or_unpaired`

[Issue](https://github.com/galaxyproject/galaxy/issues/24226) · [proposal](proposal.md) · [debrief](debrief.md) · [original draft](issue_draft.md)

Filed 2026-10-17, assigned jmchilton. Came from the #24218 hardening ([branch notes](../../../branches/merged/issue_24218_can_map_over_parity_26.0/index.md), scope evaluation D/H).

## Status

Queued. Server-only fix in `effective_collection_type`: check the direct normalized suffix before the compound peel-off and strip by rank. Base `release_26.0`. A temporary copy of the fix passed all 86 `test/unit/data/dataset_collections/` tests.

## Decisions

- 2026-10-17 (John): sample_sheet half is tabled. Don't backport portions of #22565's sample_sheet guard to 26.0 for now.

## Next

Branch `issue_24226_effective_map_over_compound_26.0` off `release_26.0`:
- Red-to-green: pin the issue's rows in `test_type_descriptions.py`, add the `get_structure` repro to `test_structure.py`, and mirror the rows in client `collectionTypeDescription.test.ts`.
- Then apply the fix.
- Add one API test if it's cheap.
