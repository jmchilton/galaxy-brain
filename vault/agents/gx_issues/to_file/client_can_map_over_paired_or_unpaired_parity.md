# Client `CollectionTypeDescription.canMapOver` disagrees with server for `paired_or_unpaired` types

Raw agent draft (found + fixed on branch `issue_20657_input_processing_mode`, 2026-10-17). Polish per PREPARE_TO_FILE.md. Backport target: **release_25.1**.

## Bug

`client/src/components/Workflow/Editor/modules/collectionTypeDescription.ts` `canMapOver` has an `if (this.rank <= other.rank)` branch (release_25.1 ~L114–125) that answers `paired_or_unpaired` cases before the "cannot map over self" check, diverging from Python `can_map_over` (`lib/galaxy/model/dataset_collections/type_description.py`):
- `paired` or `list` → **can** map over a `list:paired_or_unpaired` input on the client; server says no (no spare outer rank).
- `paired_or_unpaired` → can map over itself on the client; server says no.

Used by the workflow editor's connection logic (terminals) and by tool-form collection matching, so the editor allows connections the server/runtime won't map over that way → confusing invalid workflows / wrong map-over at run.

## Fix (already on feature branch — preferred approach)

Reorder to Python's rule order: self-check first, then `:other` suffix match, then `paired_or_unpaired` (anything but `paired`), then `X:paired_or_unpaired` (strip trailing `:paired`, require *extra* higher ranks: `endsWith(higherRanks, required) && higherRanks != required`). Ports Python's `test_compound_paired_or_unpaired_can_map_over` to `collectionTypeDescription.test.ts`.

Commits on `jmchilton/issue_20657_input_processing_mode`:
- `b89794a9f36` Baseline tests (collectionTypeDescription.test.ts part pins the cases that already agree).
- `00e2bf07047` Match server canMapOver for compound paired_or_unpaired inputs (self-contained, +8 test / ~40 src lines).

## Affected versions / backport notes

Present release_25.1 → dev. release_26.0+ wraps types with `normalizeCollectionType` (sample sheet); 25.1 doesn't — backport to 25.1 is the same logic without normalization; merge forward will conflict trivially.

## Test plan

vitest `collectionTypeDescription.test.ts`: port Python cases; assert `paired`/`list` ✗ over `list:paired_or_unpaired`, `list:list`/`list:list:paired` ✓, `paired_or_unpaired` ✗ over self, `list` ✓ over `paired_or_unpaired`, `paired` ✗. Run Workflow editor terminal tests too (`terminals.test.ts`).

## Related

- `tool_form_collection_drop_matching_ends_with.md` (uses this). #20657 feature branch record: vault/repositories/galaxy/branches/active/issue_20657_input_processing_mode/.
