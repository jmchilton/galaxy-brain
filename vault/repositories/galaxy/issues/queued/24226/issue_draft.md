# Effective map-over type wrong for `sample_sheet` inputs (both sides) and nested compound `:paired_or_unpaired` (server)

Queued by gx_workhorse from the hardening of `issue_24218_can_map_over_parity_26.0` (galaxy#24218). Agent-to-agent draft; reshape before filing.

## Summary

The *predicate* (can X map over input Y) is now at parity on the #24218 branch: 0 disagreements over 7744 type pairs. The *effective map-over type* (what's left after mapping X over Y) is still wrong in two families:

1. **`sample_sheet` truncation, client and server.** Client `CollectionTypeDescription.effectiveMapOver` and server `CollectionTypeDescription.effective_collection_type` strip the suffix using the length of the *unnormalized* input type. `sample_sheet` is normalized to `list` for matching, but the strip uses `len("sample_sheet") + 1`, so the result is cut short.
2. **Nested compound ordering, server only.** In `effective_collection_type`, the compound `:paired_or_unpaired` peel-off loop runs in a way that leaves one rank too many for higher-rank inputs. The client gets these right.

Base: `release_26.0` (same area as #24218; 25.1 lacks compound `paired_or_unpaired` support. `sample_sheet` normalization should be checked on 25.1 before choosing the base).

## Observed (harness against release_26.0 + #24218 branch head `d29206dcd71`)

| Connected (this) | Input (other) | Client | Server | Expected |
| --- | --- | --- | --- | --- |
| `list:list` | `sample_sheet` | `""` | `""` | `list` |
| `list:list:list` | `sample_sheet` | `"l"` | `"l"` | `list:list` |
| `list:paired:list` | `sample_sheet` | `"lis"` | `"lis"` | `list:paired` |
| `list:list:paired` | `sample_sheet:paired` | `""` | `""` | `list` |
| `list:list:paired_or_unpaired` | `sample_sheet:paired_or_unpaired` | `""` | `list:list` | `list` |
| `list:list:paired_or_unpaired` | `list:paired_or_unpaired` | `list` | `list:list` | `list` |

The parity harness misses most `sample_sheet` rows because both sides agree on the wrong answer. Pinned expected values are needed, not just client == server checks.

Client harness output also lists 89 effective-type disagreements that existed before #24218. Most of them involve `record` or a non-innermost `paired_or_unpaired` and aren't realistic. The realistic ones are the 6 `list:`/`paired:` higher-rank rows (family 2) and the `sample_sheet:paired_or_unpaired` rows.

## Impact

- **Editor:** `terminals.ts` `_effectiveMapOver` only filters `NULL_COLLECTION_TYPE_DESCRIPTION`, so `CTD("")` is accepted as a map-over. That's the same 💥 symptom as #24218: a connection accepted with a bogus map-over type, so downstream connection checks and output types are wrong.
- **Server:** `effective_collection_type` is used by `lib/galaxy/model/dataset_collections/structure.py` (via `effective_collection_type_description`) for map-over structure at run time. A wrong type means wrong output collection structure or a failure. `sample_sheet` inputs exist in-tree, so the shapes are realistic.

## Code

- Server: `lib/galaxy/model/dataset_collections/type_description.py` `effective_collection_type` (~L64-102 on 26.0). The final `return self.collection_type[: -(len(subcollection_type) + 1)]` should use the normalized length. The compound branch (`normalized_sub.endswith(":paired_or_unpaired")`) peels ranks per `:` in the *other* type and then strips one more if `normalized.endswith(":paired")`. Recheck it against the higher-rank rows above.
- Client: `client/src/components/Workflow/Editor/modules/collectionTypeDescription.ts` `effectiveMapOver` (~L152). Same unnormalized-length strip; `sample_sheet:paired_or_unpaired` gives `""`.
- Not recommended: a guard in `_effectiveMapOver` that rejects `""`. `list:list` over `sample_sheet` is a valid map-over, so the type should be fixed, not the connection rejected.

## Suggested fix / tests

- Use the normalized types' lengths (or rank-based stripping) on both sides. Fix the server compound ordering to match the client.
- Unit tests that pin expected values for the table rows on both sides: `test/unit/data/dataset_collections/test_type_descriptions.py` and `collectionTypeDescription.test.ts`.
- Probably one API/workflow test mapping `list:list` over a `sample_sheet` input tool to cover the runtime structure path.
- Dev follow-up, not for this issue: a shared JSON parity table with pinned expectations, read by both vitest and pytest.

## References

- galaxy#24218, branch `jmchilton/issue_24218_can_map_over_parity_26.0`
- Evidence: `vault/repositories/galaxy/branches/active/issue_24218_can_map_over_parity_26.0/scope_evaluation.md` sections D and H
