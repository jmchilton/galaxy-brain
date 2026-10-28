# Tool form: drag-and-drop collection matching uses plain `endsWith` (wrong accept/reject; dropped DCE loses map-over)

Raw agent draft (found + fixed on branch `issue_20657_input_processing_mode`, 2026-10-17). Polish per PREPARE_TO_FILE.md. Backport target: **release_25.1**.

## Bug

`client/src/components/Form/Elements/FormData/FormData.vue` decides whether a dragged collection fits a `data_collection` input with plain string suffix checks, not the collection-type rules the server uses:
- `toDataOption` (release_25.1 ~L465–469): `itemCollectionType.endsWith(collectionType)` to set `map_over_type` on a dropped HDCA.
- drop handler (release_25.1 ~L661): `props.collectionTypes.some((element) => collectionType.endsWith(element))`.

Consequences (no `:` boundary, no `paired_or_unpaired` rules):
1. `paired` input accepts a dropped `list:paired_or_unpaired` (and marks it mapped over) — server would not list it.
2. `paired_or_unpaired` input rejects dropped `list` / `list:paired`, which the server does list (as map-over).
3. Dropped collection **element** (DCE, e.g. inner `list:list` element dropped on a `list` input) isn't classified like an HDCA, so it's sent `batch: false` — runs one job on the whole thing (or errors) instead of mapping over.

Silent wrong behavior: wrong job count / wrong input structure, or a valid drop refused.

## Fix (already on feature branch — preferred approach)

Reuse `CollectionTypeDescription` `accepts` / `canMapOver` (`client/src/components/Workflow/Editor/modules/collectionTypeDescription.ts`) plus the server's `paired_or_unpaired` map-over adjustment, and classify dropped DCEs the same way as HDCAs. Commits on `jmchilton/issue_20657_input_processing_mode`:
- `b89794a9f36` Baseline tests for collection drop matching and dedupe (pins current behavior; FormData.test.ts).
- `9ff2eb69afd` Match dropped collections to inputs like the server (`matchCollectionType` helper in `processingMode.ts`, FormData.vue drop + `toDataOption`).
- `68b8d3969e5` Align dropped-collection map over with server (map over deepest accepted type; overlaps with marker/dedupe work — cherry-pick needs hand-splitting).
- `057ac69f904` Map dropped collection elements over inputs like collections (DCE fix, small).

Backport should cherry-pick the matching logic + its FormData.test.ts cases, not the processing-hint / marker parts. `processingMode.ts` doesn't exist on 25.1 — put the helper in FormData.vue or `types.ts`/a small module.

Depends on `canMapOver` being correct for `X:paired_or_unpaired` — see `client_can_map_over_paired_or_unpaired_parity.md`; land together or that one first.

## Affected versions

Same code on release_25.1, release_26.0 (identical lines), release_26.1 (~L593/L876), 26.2, dev.

## Test plan

vitest FormData.test.ts: drop `list:paired_or_unpaired` on `paired` → rejected; drop `list` / `list:paired` on `paired_or_unpaired` → accepted with server's `map_over_type`; drop `list:list` DCE on `list` → `{batch: true, values: [{src: "dce", map_over_type: "list"}]}`.

## Related

- #19234, #20657 (feature branch). Branch record: vault/repositories/galaxy/branches/active/issue_20657_input_processing_mode/.
