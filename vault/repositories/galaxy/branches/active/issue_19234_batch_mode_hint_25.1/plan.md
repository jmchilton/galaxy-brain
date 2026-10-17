# issue_19234_batch_mode_hint_25.1 — plan

## Root cause

`client/src/components/Form/Elements/FormData/FormData.vue` (release_25.1 ~L963) shows the "mapped over" / "batch mode" info only when `currentVariant.batch !== BATCH.DISABLED` — i.e. driven by input *type*. All `data_collection` variants are `BATCH.DISABLED`, so selecting a collection the server lists with `map_over_type` (map-over a `paired` input with a `list:paired`) runs one job per pair with no hint. `createValue()` (~L293–325) already emits `batch: true` for `map_over_type` values.

## Fix

- Computed for the selected values' `map_over_type` (single-select and multi-select: any selected value with `map_over_type`).
- Show the info line when the variant is batch-capable (existing) **or** the selection maps over. Text for the map-over case: reuse existing "The supplied input will be <HelpText mapped over uri=galaxy.collections.mapOver> this tool." line, adding the unit (e.g. "one job per `paired` collection") if trivial. Linked/unlinked checkbox stays gated on the variant (unchanged).
- Mirror the selection-driven rule from 20657 commit `2c302a15ee9` (`processingMode.ts`) in spirit only; keep the diff ~30 lines.

## Tests

- First commit "Baseline tests for FormData batch hint": vitest pinning current 25.1 behavior (data input with collection → hint shown; data_collection input with direct collection → no hint).
- Then red→green: data_collection input, option with `map_over_type: "paired"` selected → hint shown; direct selection → no hint; switching selection toggles it.
- Screenshot of the hint on megahit-like tool (e.g. a test tool with `paired` collection input) per screenshots process.
